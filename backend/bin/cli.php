<?php
declare(strict_types=1);

/**
 * CLI:
 *   php backend/bin/cli.php migrate
 *   php backend/bin/cli.php create-admin <login> <password>
 */
if (PHP_SAPI !== 'cli') {
    exit(1);
}
require dirname(__DIR__) . '/api/src/bootstrap.php';
require dirname(__DIR__) . '/api/src/migrate.php';

$cmd = $argv[1] ?? '';
switch ($cmd) {
    case 'migrate':
        foreach (run_migrations() as $line) {
            echo $line, PHP_EOL;
        }
        echo 'ok', PHP_EOL;
        break;
    case 'create-admin':
        [$login, $pass] = [$argv[2] ?? '', $argv[3] ?? ''];
        if ($login === '' || strlen($pass) < 8) {
            fwrite(STDERR, "Использование: create-admin <login> <password (от 8 символов)>\n");
            exit(1);
        }
        $st = db()->prepare('INSERT INTO admins (login, password_hash) VALUES (?, ?)
            ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)');
        $st->execute([$login, password_hash($pass, PASSWORD_DEFAULT)]);
        echo "Администратор $login сохранён\n";
        break;
    default:
        fwrite(STDERR, "Команды: migrate | create-admin\n");
        exit(1);
}
