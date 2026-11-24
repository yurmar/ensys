# ЭНСИС — сайт с мини-админкой

React (Vite, TypeScript) + PHP 8 (без фреймворка) + MySQL. Весь контент и подписи хранятся в БД (таблица `blocks`), схема полей каждого блока — там же. Дизайн 1:1 из `docs/brandbook` (`site-concept.html`).

## Структура

- `frontend/` — React-сайт, админка (карандаш у каждого блока → модалка), страница входа `/enterforadmin`.
- `backend/api/` — PHP API (`/api/*`), миграции, `seed/*.json` (начальные данные и схемы блоков).
- `backend/bin/` — CLI (`cli.php migrate`, `cli.php create-admin`), генератор `config.php` для деплоя.
- `.github/workflows/deploy.yml` — автодеплой при пуше в `main`.

## Локальный запуск

```bash
cp backend/api/config.example.php backend/api/config.php   # прописать доступ к MySQL
php backend/bin/cli.php migrate                            # таблицы + начальные блоки
php backend/bin/cli.php create-admin <логин> <пароль>      # пароль от 8 символов
php -S 127.0.0.1:8081 -t backend backend/dev-router.php    # API
cd frontend && pnpm install && pnpm dev                    # сайт на :5180
```

Вход: `/enterforadmin`. После входа у каждого блока появляется кнопка-карандаш, внизу слева — панель (заявки, выход).

## Как это устроено

- Блок = строка в `blocks` (`slug`, `schema_json`, `data_json`). Модалка строится из схемы: типы полей `text`, `textarea`, `url`, `svg`, `bool`, `group`, `list`, `strlist`.
- Новое поле/блок: правим `backend/api/seed/NN-slug.json` (схема + данные по умолчанию) и компонент. Миграция обновляет схему всегда, а данные из seed вставляет только для новых блоков — правки из админки не затираются.
- Сохранение: `PUT /api/blocks/{slug}`, только для администратора, с CSRF-токеном; данные валидируются по схеме (SVG и ссылки фильтруются).
- Заявки с формы пишутся в `requests` (и уходят на почту из блока «Шапка и общие данные»).

## Деплой

Пуш в `main` → GitHub Actions собирает фронт, кладёт `api/` + сгенерированный `config.php` и заливает по FTP, затем вызывает `POST /api/migrate`. Секреты репозитория:

`FTP_HOST`, `FTP_USER`, `FTP_PASSWORD`, `FTP_DIR` (папка сайта на сервере), `FTP_PROTOCOL` (`ftp`/`ftps`), `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`, `MIGRATE_TOKEN`, `ADMIN_LOGIN`, `ADMIN_PASSWORD` (первый админ, создаётся при пустой таблице), `SITE_URL` (https://домен).
