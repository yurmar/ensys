<?php
declare(strict_types=1);

/**
 * Идемпотентные миграции + синхронизация схем блоков из seed/*.json.
 * Данные блока из seed вставляются только если блока ещё нет — правки из админки не затираются.
 * Схема полей блока обновляется при каждом запуске.
 */

function run_migrations(): array
{
    $pdo = db();
    $log = [];

    $pdo->exec('CREATE TABLE IF NOT EXISTS migrations (
        id VARCHAR(64) PRIMARY KEY,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');

    $migrations = [
        '001_admins' => 'CREATE TABLE admins (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            login VARCHAR(64) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        '002_blocks' => 'CREATE TABLE blocks (
            slug VARCHAR(64) PRIMARY KEY,
            title VARCHAR(190) NOT NULL,
            sort INT NOT NULL DEFAULT 0,
            schema_json LONGTEXT NOT NULL,
            data_json LONGTEXT NOT NULL,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            updated_by VARCHAR(64) NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        '003_requests' => 'CREATE TABLE requests (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(120) NOT NULL,
            phone VARCHAR(40) NOT NULL,
            company VARCHAR(160) NOT NULL DEFAULT "",
            message TEXT NOT NULL,
            ip VARCHAR(45) NOT NULL DEFAULT "",
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            KEY idx_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        '004_throttle' => 'CREATE TABLE throttle (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            bucket VARCHAR(32) NOT NULL,
            ip VARCHAR(45) NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            KEY idx_bucket (bucket, ip, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
    ];

    $done = $pdo->query('SELECT id FROM migrations')->fetchAll(PDO::FETCH_COLUMN);
    foreach ($migrations as $id => $sql) {
        if (in_array($id, $done, true)) {
            continue;
        }
        $pdo->exec($sql);
        $pdo->prepare('INSERT INTO migrations (id) VALUES (?)')->execute([$id]);
        $log[] = "миграция $id применена";
    }

    // Блоки из seed
    $files = glob(dirname(__DIR__) . '/seed/*.json') ?: [];
    sort($files);
    $exists = $pdo->prepare('SELECT 1 FROM blocks WHERE slug = ?');
    $insert = $pdo->prepare('INSERT INTO blocks (slug, title, sort, schema_json, data_json) VALUES (?,?,?,?,?)');
    $updSchema = $pdo->prepare('UPDATE blocks SET title = ?, sort = ?, schema_json = ? WHERE slug = ?');
    foreach ($files as $file) {
        $seed = json_decode((string)file_get_contents($file), true);
        if (!is_array($seed) || empty($seed['slug'])) {
            throw new RuntimeException('Некорректный seed: ' . basename($file));
        }
        $schemaJson = json_encode($seed['schema'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $exists->execute([$seed['slug']]);
        if ($exists->fetchColumn()) {
            $updSchema->execute([$seed['title'], $seed['sort'], $schemaJson, $seed['slug']]);
        } else {
            $data = clean_by_schema($seed['schema'], $seed['data']);
            $insert->execute([
                $seed['slug'], $seed['title'], $seed['sort'], $schemaJson,
                json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ]);
            $log[] = 'блок ' . $seed['slug'] . ' создан';
        }
    }

    // Первый администратор из конфига (пароль хранится только хэшем)
    $init = config()['initial_admin'] ?? null;
    if ($init && !empty($init['login']) && !empty($init['hash'])) {
        $n = (int)$pdo->query('SELECT COUNT(*) FROM admins')->fetchColumn();
        if ($n === 0) {
            $pdo->prepare('INSERT INTO admins (login, password_hash) VALUES (?, ?)')->execute([$init['login'], $init['hash']]);
            $log[] = 'создан администратор ' . $init['login'];
        }
    }

    return $log;
}
