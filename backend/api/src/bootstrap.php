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
    $ip = (string)($_SERVER['REMOTE_ADDR'] ?? '');
    // Заголовкам прокси верим только если запрос пришёл с локального/приватного адреса (nginx перед Apache)
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
        $fwd = trim((string)($_SERVER['HTTP_X_REAL_IP'] ?? explode(',', (string)($_SERVER['HTTP_X_FORWARDED_FOR'] ?? ''))[0]));
        if (filter_var($fwd, FILTER_VALIDATE_IP)) {
            $ip = $fwd;
        }
    }
    return substr($ip, 0, 45);
}

function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
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

const SVG_ELEMENTS = ['svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'defs', 'linearGradient', 'radialGradient', 'stop'];
const SVG_ATTRS = ['viewBox', 'width', 'height', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit',
    'stroke-dasharray', 'stroke-dashoffset', 'd', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'points', 'transform', 'opacity',
    'fill-opacity', 'stroke-opacity', 'fill-rule', 'clip-rule', 'id', 'offset', 'stop-color', 'stop-opacity', 'gradientUnits', 'gradientTransform',
    'aria-hidden', 'preserveAspectRatio'];

/** SVG по белому списку элементов и атрибутов; пересобирается заново, ничего «лишнего» не пропускает. */
function clean_svg(string $svg): string
{
    $svg = trim($svg);
    if ($svg === '') {
        return '';
    }
    if (strlen($svg) > 20000) {
        throw new InvalidArgumentException('SVG слишком большой');
    }
    if (preg_match('/<!(DOCTYPE|ENTITY|\[CDATA)/i', $svg)) {
        throw new InvalidArgumentException('В SVG не допускаются DOCTYPE, ENTITY и CDATA');
    }
    $prev = libxml_use_internal_errors(true);
    $dom = new DOMDocument();
    $ok = $dom->loadXML($svg, LIBXML_NONET | LIBXML_NOBLANKS);
    libxml_clear_errors();
    libxml_use_internal_errors($prev);
    if (!$ok || !$dom->documentElement || $dom->documentElement->localName !== 'svg') {
        throw new InvalidArgumentException('Некорректный SVG: корневой элемент должен быть <svg>');
    }
    $render = function (DOMElement $el) use (&$render): string {
        if (!in_array($el->localName, SVG_ELEMENTS, true) || ($el->namespaceURI !== null && $el->namespaceURI !== 'http://www.w3.org/2000/svg')) {
            throw new InvalidArgumentException('Недопустимый элемент SVG: ' . $el->nodeName);
        }
        $attrs = '';
        foreach ($el->attributes as $a) {
            if (str_starts_with($a->nodeName, 'xmlns') && $el->localName === 'svg') {
                continue; // пространство имён добавляется браузером
            }
            if (!in_array($a->nodeName, SVG_ATTRS, true)) {
                throw new InvalidArgumentException('Недопустимый атрибут SVG: ' . $a->nodeName);
            }
            $v = $a->value;
            if (!preg_match('/^[A-Za-z0-9\s.,#()\-+%]*$/', $v)
                || (str_contains($v, '(') && !preg_match('/^url\(#[\w-]+\)$/', $v) && !preg_match('/^((matrix|translate|scale|rotate|skewX|skewY)\([\d\s.,\-+]*\)\s*)+$/', $v))) {
                throw new InvalidArgumentException('Недопустимое значение атрибута ' . $a->nodeName);
            }
            $attrs .= ' ' . $a->nodeName . '="' . htmlspecialchars($v, ENT_QUOTES) . '"';
        }
        $inner = '';
        foreach ($el->childNodes as $c) {
            if ($c instanceof DOMElement) {
                $inner .= $render($c);
            } elseif ($c instanceof DOMComment) {
                continue;
            } elseif (!($c instanceof DOMText && trim($c->nodeValue) === '')) {
                throw new InvalidArgumentException('В SVG не допускается текст и другие узлы');
            }
        }
        return "<{$el->localName}{$attrs}>$inner</{$el->localName}>";
    };
    return $render($dom->documentElement);
}

function clean_url(string $url): string
{
    $url = trim($url);
    if ($url === '') {
        return '';
    }
    if (!preg_match('~^(https?://|mailto:|tel:|/(?![/\\\\])|#|\./)~i', $url) || preg_match('/[\s"\'<>\\\\()`]|[\x00-\x1f]/', $url)) {
        throw new InvalidArgumentException('Ссылка должна начинаться с https://, /, #, mailto: или tel: и не содержать пробелов и кавычек');
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
                    if (count($items) > 100) {
                        throw new InvalidArgumentException('Слишком много элементов');
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
