<?php
declare(strict_types=1);

/** Общие функции: конфиг, БД, ответы, сессия, проверка данных блоков по схеме. */

function config(): array
{
    static $cfg = null;
    if ($cfg === null) {
        $file = dirname(__DIR__) . '/config.php';
        if (!is_file($file)) {
            json_out(['error' => 'Не настроен config.php'], 500);
        }
        $cfg = require $file;
    }
    return $cfg;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $c = config()['db'];
        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $c['host'], $c['port'] ?? 3306, $c['name']);
        $pdo = new PDO($dsn, $c['user'], $c['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
    return $pdo;
}

function json_out(mixed $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function body(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function client_ip(): string
{
    return substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45);
}

function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_name('ensys_sid');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $https,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function is_admin(): bool
{
    start_session();
    return !empty($_SESSION['admin_id']);
}

function csrf_token(): string
{
    start_session();
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(24));
    }
    return $_SESSION['csrf'];
}

function require_admin(bool $mutating = false): void
{
    if (!is_admin()) {
        json_out(['error' => 'Требуется вход администратора'], 401);
    }
    if ($mutating) {
        $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if (!hash_equals(csrf_token(), (string)$sent)) {
            json_out(['error' => 'Неверный CSRF-токен'], 403);
        }
    }
}

/* ---------- Проверка данных блока по схеме ---------- */

function clean_svg(string $svg): string
{
    $svg = trim($svg);
    if ($svg === '') {
        return '';
    }
    if (!preg_match('/^<svg[\s>]/i', $svg) || !preg_match('/<\/svg>\s*$/i', $svg)) {
        throw new InvalidArgumentException('SVG должен начинаться с <svg и заканчиваться </svg>');
    }
    if (preg_match('/<\s*(script|foreignObject|iframe|object|embed|style)\b|\son[a-z]+\s*=|javascript:|data:text\/html/i', $svg)) {
        throw new InvalidArgumentException('SVG содержит недопустимые элементы');
    }
    return $svg;
}

function clean_url(string $url): string
{
    $url = trim($url);
    if ($url === '') {
        return '';
    }
    if (!preg_match('~^(https?://|mailto:|tel:|/|#|\./)~i', $url)) {
        throw new InvalidArgumentException('Ссылка должна начинаться с https://, /, #, mailto: или tel:');
    }
    return $url;
}

/**
 * Приводит данные к виду, заданному схемой: лишние ключи отбрасываются, типы приводятся.
 * @param array<int,array<string,mixed>> $fields
 */
function clean_by_schema(array $fields, mixed $data, string $path = ''): array
{
    $data = is_array($data) ? $data : [];
    $out = [];
    foreach ($fields as $f) {
        $key = $f['key'];
        $label = $f['label'] ?? $key;
        $val = $data[$key] ?? null;
        $type = $f['type'];
        try {
            switch ($type) {
                case 'text':
                case 'textarea':
                    $s = trim((string)($val ?? ''));
                    $max = (int)($f['max'] ?? ($type === 'text' ? 300 : 3000));
                    if (mb_strlen($s) > $max) {
                        throw new InvalidArgumentException("Не длиннее $max символов");
                    }
                    if (!empty($f['required']) && $s === '') {
                        throw new InvalidArgumentException('Обязательное поле');
                    }
                    $out[$key] = $s;
                    break;
                case 'url':
                    $out[$key] = clean_url((string)($val ?? ''));
                    break;
                case 'svg':
                    $out[$key] = clean_svg((string)($val ?? ''));
                    break;
                case 'bool':
                    $out[$key] = (bool)$val;
                    break;
                case 'group':
                    $out[$key] = clean_by_schema($f['fields'], $val, $path . $key . '.');
                    break;
                case 'strlist':
                    $items = [];
                    foreach (is_array($val) ? $val : [] as $s) {
                        $s = trim((string)$s);
                        if ($s !== '') {
                            if (mb_strlen($s) > 400) {
                                throw new InvalidArgumentException('Элемент списка слишком длинный');
                            }
                            $items[] = $s;
                        }
                    }
                    $out[$key] = $items;
                    break;
                case 'list':
                    $items = [];
                    foreach (is_array($val) ? $val : [] as $row) {
                        $items[] = clean_by_schema($f['fields'], $row, $path . $key . '[].');
                    }
                    if (count($items) > 60) {
                        throw new InvalidArgumentException('Слишком много элементов');
                    }
                    $out[$key] = $items;
                    break;
                default:
                    throw new InvalidArgumentException("Неизвестный тип поля $type");
            }
        } catch (InvalidArgumentException $e) {
            throw new InvalidArgumentException("«{$label}»: " . $e->getMessage());
        }
    }
    return $out;
}
