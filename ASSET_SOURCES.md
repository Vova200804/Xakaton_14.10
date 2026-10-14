# Источники визуальных материалов

Исходные макеты: предоставленный владельцем каталог `arctic-design`. 10 растровых листов по четыре страницы и отдельный `approved-home.png`. Полные страницы не используются в качестве интерфейса.

Большинство `dist/assets/*.webp` — фотографии и фрагменты, извлечённые из листов дизайна. Логотип медведя извлечён из approved-home. Маленькие исходники имеют ограниченное разрешение. Карта, миниатюры и демонстрационные персонажи сохранены для соответствия макетам.

## Восстановленные фоны

В обоих случаях использован **встроенный ImageGen**, затем файл сохранён в проекте в WebP. Исходные PNG не изменялись. Результаты сохраняют общую композицию, но не являются идентичными исходным фотографиям.

### `dist/assets/hero.webp`

Вход: approved-home.png. Итоговое задание:

> Use case: precise-object-edit. Edit target: provided approved Arctic website screenshot. Asset type: clean website hero background photograph. Remove ALL text, logos, lines, navigation, buttons, coordinates, UI overlays and the entire bottom white section. Reconstruct the original photograph behind removed typography. Keep the exact photographic scene unchanged: same polar bear on right, same posture and size, ice foreground, mountain cliffs at center, dark navy left, pale sunset on right, green aurora and star sky. Output only the clean wide photographic hero scene corresponding to the top 775 pixels of the reference, landscape 1536 x 768, no text or white section. Preserve composition and colors aggressively. This is background extraction for recreating the supplied website exactly; do not invent new scene.

### `dist/assets/mountain-hd.webp`

Вход: `dist/assets/mountain.webp`, фрагмент панорамы из 01-public.png. Итоговое задание:

> Use case: precise-object-edit. Edit target: provided 390 x 118 Arctic panorama extracted from approved UI concept. Asset type: high-resolution website panoramic banner. Carefully reconstruct and upscale this EXACT photograph, keeping identical framing, mountain silhouettes, relative iceberg positions, water, horizon, warm right-side sunset sunburst and muted blue/gray tones. Output wide panoramic 1536 x 464. Enhance photographic crispness and texture without altering the scene or composition. No text, logos, UI, border, extra animals, extra mountains, or added objects. Keep the left mountain slope and large squared iceberg on right in exact same positions. Do not zoom or crop, preserve complete image.

## Повторная доработка фотографий

Новые файлы в dist/assets созданы встроенным ImageGen из исходных фотографий. Веб-интерфейс не зависит от каталога генерации; результаты физически сохранены в проекте. Промпты перечислены в IMAGE_PROMPTS.md.

| Файл | Источник / назначение |
| --- | --- |
| home-reference.webp | approved-home: восстановленный левый фон и сохранённые исходные пиксели справа |
| arctic-scene-hd.webp | Чистая сцена из approved-home для остальных обложек |
| participation-hd.webp | Путешественница с рюкзаком из 02-participation |
| expedition.webp | Группа на льду на закате из новостной карточки 03-media-news |
| bear-hd.webp | Медведь на снегу из медиатеки |
| iceberg-hd.webp | Айсберг на розовом закате |
| ship-hd.webp | Красный ледокол |
| aurora-hd.webp | Зелёное северное сияние |
| ice-hd.webp | Ледник |
| explorer-hd.webp | Исследователи с приборами из карточки профессий |
| underwater-hd.webp | Подводный лёд из проекта о микропластике |
| islands-hd.webp | Скальные острова |
| bear-face-hd.webp | Медведь крупным планом из карточки исследований |
| bear-banner-crop.webp | Светлая обложка статьи с медведем, развёрнутым к зрителю |
| bear-swimming.webp | Подводная сцена: круг воспроизведения и время удалены с фотографии |
| explorers-group.webp | Исправленный чистый кроп группы из истории конкурса |

Старые малые WebP сохранены для происхождения. Главная больше не использует старый hero.webp. Карта и часть небольших демонстрационных портретов остаются исходными кропами.

ImageGen восстанавливает новые детали и не гарантирует идентичность всей фотографии. Для главной пиксели справа сохранены отдельно: область медведя x1140, y205, 270 × 410 совпала с эталоном без ошибок RGB в браузерном снимке. Результат — artifacts/home-photo-fidelity.json.

## Шрифты

Основной интерфейс использует локальный **Manrope Variable 200–800** с кириллицей, включая Ё/ё. Заголовок главной имеет настоящее тонкое начертание 300. Файл: `dist/assets/fonts/Manrope-Variable.ttf`; лицензия SIL OFL приложена. Источник: официальный репозиторий Google Fonts, https://github.com/google/fonts/tree/main/ofl/manrope.

Для исследования сохранены Inter, Onest, Golos Text, Oswald и Roboto Condensed с лицензиями; сайт их не загружает. Старые файлы Manrope сохранены также для PDF. Источник исходного шрифта макетов не указан, поэтому обычные заголовки подобраны сравнением.

`arctic-wordmark.svg` содержит контуры семи букв «АРКТИКА» из approved-home и ледяную текстуру только внутри букв. Это отдельный брендовый элемент с доступным alt, а не снимок страницы. Чистая контурная версия — `arctic-wordmark-contours.svg`. При 1536px рамка совпадает с эталоном с погрешностью менее 1px. Системный Impact больше не используется для надписи.
