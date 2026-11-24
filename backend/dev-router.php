<?php
// Роутер для `php -S 127.0.0.1:8081 -t backend backend/dev-router.php` (только для разработки).
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (str_starts_with($path, '/api')) {
    require __DIR__ . '/api/index.php';
    return true;
}
return false;
