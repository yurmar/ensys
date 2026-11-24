<?php
// Скопируйте в config.php (он в .gitignore). На проде файл создаёт деплой из секретов GitHub.
return [
    'db' => [
        'host' => '127.0.0.1',
        'port' => 3306,
        'name' => 'ensys',
        'user' => 'ensys',
        'pass' => '',
    ],
    'migrate_token' => '',
    // Первый администратор: создаётся при миграции, если таблица admins пуста
    'initial_admin' => ['login' => '', 'hash' => ''],
];
