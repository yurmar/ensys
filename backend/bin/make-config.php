<?php
declare(strict_types=1);

/** Генерирует api/config.php из переменных окружения (используется деплоем). Использование: php make-config.php <путь> */
$need = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS', 'MIGRATE_TOKEN'];
foreach ($need as $k) {
    if (getenv($k) === false || getenv($k) === '') {
        fwrite(STDERR, "Не задана переменная $k\n");
        exit(1);
    }
}
$admin = ['login' => '', 'hash' => ''];
if (getenv('ADMIN_LOGIN') && getenv('ADMIN_PASSWORD')) {
    $admin = ['login' => getenv('ADMIN_LOGIN'), 'hash' => password_hash(getenv('ADMIN_PASSWORD'), PASSWORD_DEFAULT)];
}
$cfg = [
    'db' => ['host' => getenv('DB_HOST'), 'port' => (int)(getenv('DB_PORT') ?: 3306), 'name' => getenv('DB_NAME'), 'user' => getenv('DB_USER'), 'pass' => getenv('DB_PASS')],
    'migrate_token' => getenv('MIGRATE_TOKEN'),
    'initial_admin' => $admin,
];
file_put_contents($argv[1], "<?php\nreturn " . var_export($cfg, true) . ";\n");
echo "config written\n";
