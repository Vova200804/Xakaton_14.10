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

## Шрифты

Локальные Manrope 400–800 и Anton 400 получены из Google Fonts. Лицензии SIL Open Font License приложены в `dist/assets/manrope-OFL.txt` и `anton-OFL.txt`.

Файлы с расширением `.woff2` имеют TrueType-сигнатуру; таблицы @font-face намеренно используют format('truetype'). Во время проверки браузер загружает их без сетевых запросов к Google. Anton не содержит кириллицы; слово «АРКТИКА» отображается установленным узким кириллическим шрифтом Impact с подходящими пропорциями. Оригинальный шрифт в макетах не указан.

Для переноса в другую ОС следует проверить резервный кириллический шрифт и внешний вид крупного заголовка. На Windows с Microsoft Edge внешний вид проверен. Совпадение пиксель в пиксель не заявляется.
