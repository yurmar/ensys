<?php
declare(strict_types=1);

require __DIR__ . '/src/bootstrap.php';
require __DIR__ . '/src/migrate.php';

header('X-Content-Type-Options: nosniff');

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$path = preg_replace('~^.*?/api/?~', '/', $path, 1);
$path = '/' . trim((string)$path, '/');
if ($path === '/index.php') {
    $path = '/';
}

function throttled(string $bucket, int $limit, int $seconds): bool
{
    $st = db()->prepare('SELECT COUNT(*) FROM throttle WHERE bucket = ? AND ip = ? AND created_at > (NOW() - INTERVAL ? SECOND)');
    $st->execute([$bucket, client_ip(), $seconds]);
    return (int)$st->fetchColumn() >= $limit;
}

function throttle_hit(string $bucket): void
{
    db()->prepare('INSERT INTO throttle (bucket, ip) VALUES (?, ?)')->execute([$bucket, client_ip()]);
    db()->exec('DELETE FROM throttle WHERE created_at < (NOW() - INTERVAL 1 DAY)');
}

try {
    // --- Публичный контент ---
    if ($path === '/content' && $method === 'GET') {
        $rows = db()->query('SELECT slug, title, schema_json, data_json FROM blocks ORDER BY sort, slug')->fetchAll();
        $admin = is_admin();
        $blocks = [];
        $schemas = [];
        foreach ($rows as $r) {
            $blocks[$r['slug']] = json_decode($r['data_json'], true);
            if ($admin) {
                $schemas[$r['slug']] = ['title' => $r['title'], 'fields' => json_decode($r['schema_json'], true)];
            }
        }
        $out = ['blocks' => $blocks, 'admin' => $admin];
        if ($admin) {
            $out['schemas'] = $schemas;
            $out['csrf'] = csrf_token();
        }
        json_out($out);
    }

    // --- Сессия администратора ---
    if ($path === '/session' && $method === 'GET') {
        $admin = is_admin();
        json_out(['admin' => $admin, 'csrf' => $admin ? csrf_token() : null]);
    }

    if ($path === '/login' && $method === 'POST') {
        if (throttled('login', 5, 900)) {
            json_out(['error' => 'Слишком много попыток. Повторите через 15 минут'], 429);
        }
        $in = body();
        $st = db()->prepare('SELECT id, password_hash FROM admins WHERE login = ?');
        $st->execute([trim((string)($in['login'] ?? ''))]);
        $row = $st->fetch();
        $ok = $row && password_verify((string)($in['password'] ?? ''), $row['password_hash']);
        if (!$ok) {
            throttle_hit('login');
            json_out(['error' => 'Неверный логин или пароль'], 401);
        }
        start_session();
        session_regenerate_id(true);
        $_SESSION['admin_id'] = (int)$row['id'];
        $_SESSION['admin_login'] = trim((string)$in['login']);
        unset($_SESSION['csrf']);
        json_out(['admin' => true, 'csrf' => csrf_token()]);
    }

    if ($path === '/logout' && $method === 'POST') {
        require_admin(true);
        $_SESSION = [];
        session_destroy();
        json_out(['admin' => false]);
    }

    // --- Редактирование блока ---
    if (preg_match('~^/blocks/([a-z0-9_-]+)$~', $path, $m) && $method === 'PUT') {
        require_admin(true);
        $st = db()->prepare('SELECT schema_json FROM blocks WHERE slug = ?');
        $st->execute([$m[1]]);
        $schema = $st->fetchColumn();
        if ($schema === false) {
            json_out(['error' => 'Блок не найден'], 404);
        }
        $in = body();
        try {
            $data = clean_by_schema(json_decode($schema, true), $in['data'] ?? []);
        } catch (InvalidArgumentException $e) {
            json_out(['error' => $e->getMessage()], 422);
        }
        db()->prepare('UPDATE blocks SET data_json = ?, updated_by = ? WHERE slug = ?')
            ->execute([json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $_SESSION['admin_login'] ?? null, $m[1]]);
        json_out(['data' => $data]);
    }

    // --- Заявки с сайта ---
    if ($path === '/requests' && $method === 'POST') {
        $in = body();
        if (!empty($in['website'])) { // honeypot
            json_out(['ok' => true]);
        }
        if (throttled('request', 5, 3600)) {
            json_out(['error' => 'Слишком много заявок. Попробуйте позже'], 429);
        }
        $name = trim((string)($in['name'] ?? ''));
        $phone = trim((string)($in['phone'] ?? ''));
        $company = trim((string)($in['company'] ?? ''));
        $message = trim((string)($in['message'] ?? ''));
        if ($name === '' || $phone === '' || $message === '' || mb_strlen($name) > 90 || mb_strlen($phone) > 32
            || mb_strlen($company) > 120 || mb_strlen($message) > 650) {
            json_out(['error' => 'Проверьте заполнение полей'], 422);
        }
        db()->prepare('INSERT INTO requests (name, phone, company, message, ip) VALUES (?,?,?,?,?)')
            ->execute([$name, $phone, $company, $message, client_ip()]);
        throttle_hit('request');

        $site = db()->query("SELECT data_json FROM blocks WHERE slug = 'site'")->fetchColumn();
        $email = $site ? (json_decode($site, true)['email'] ?? '') : '';
        if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $text = "Имя: $name\r\nТелефон: $phone\r\nОрганизация: $company\r\n\r\n$message";
            @mail($email, '=?UTF-8?B?' . base64_encode('Запрос предложения с сайта') . '?=', $text,
                "Content-Type: text/plain; charset=UTF-8\r\nFrom: noreply@" . preg_replace('/^www\./', '', $_SERVER['HTTP_HOST'] ?? 'localhost'));
        }
        json_out(['ok' => true], 201);
    }

    if ($path === '/requests' && $method === 'GET') {
        require_admin();
        json_out(['items' => db()->query('SELECT id, name, phone, company, message, created_at FROM requests ORDER BY id DESC LIMIT 200')->fetchAll()]);
    }

    // --- Миграции (вызывается деплоем по секретному токену) ---
    if ($path === '/migrate' && $method === 'POST') {
        $token = (string)(config()['migrate_token'] ?? '');
        $sent = (string)($_SERVER['HTTP_X_MIGRATE_TOKEN'] ?? '');
        if ($token === '' || !hash_equals($token, $sent)) {
            json_out(['error' => 'Forbidden'], 403);
        }
        json_out(['log' => run_migrations()]);
    }

    json_out(['error' => 'Не найдено'], 404);
} catch (Throwable $e) {
    error_log('[ensys] ' . $e);
    json_out(['error' => 'Внутренняя ошибка сервера'], 500);
}
