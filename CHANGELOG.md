# Изменения

## 0.1.0-dev.1 — 24.10.2026

Первый технический прототип альфы: настоящий холмистый мир, Rapier-сфера, независимый FaceRig и вращающийся узор, сохранение seed, четыре камеры, ввод ПК/touch, HUD, ограниченные эффекты и локальный PNG-снимок. Подготовлены CI и ручная конфигурация Pages без запуска деплоя.

10 тестов и production-build проходят; выполнен локальный браузерный smoke test. Исправлены обработка большого шага моргания и повторный STUN от опоры на грунт. Художественные атласы и приёмка на телефоне ещё не готовы. SDK, рекламы и платежей нет.

## 0.1.0-dev.2 — 24.10.2026

Кольца-ориентиры превращены в тестовые собираемые предметы: проверка пересечения всего пути шара, исчезновение, счётчик 0–12, короткие искры/звук и радость. Повторное начисление исключено. «На старт» восстанавливает все кольца и счётчик, сохраняя SkinSeed. Это тест сбора для альфы, не новая валюта или утверждённая замена ягод.

13 тестов проходят. Браузерный тест проводит шар touch-джойстиком через первое кольцо, проверяет счётчик 1/12 и сброс до 0/12 без ошибок JS.

## 0.1.0-dev.3 — 24.10.2026

Вращение камеры зажатой средней кнопкой мыши: горизонтальный облёт и вертикальный наклон с ограничениями. Ракурс сохраняется после отпускания и следует за позицией шара независимо от его курса. Клавиши 1–4 и кнопка камеры возвращают стандартное следование. Предотвращён автоскролл средней кнопкой; отпускание, уход фокуса и отмена указателя завершают перетаскивание. Телефонный ввод и направление FaceRig не менялись.

15 тестов и production-build проходят. Браузерный тест: middle-drag вращает, отпускание останавливает, клавиша 1 восстанавливает следование, левая кнопка не вращает; ошибок JS нет.

## 0.1.0-dev.4 — 24.10.2026

Вместо примитивной геометрии лица — модульные RGBA-детали на изогнутых участках сферы. Разные формы глаз, бровей и ртов; 12 комбинаций в read-only 3D-галерее. Закрытие глаза маской сверху вниз без сплющивания, скрытые радужки при закрытии; STUN — крестики, головокружение — спирали. BaseMood сохраняется после реакций. Полные индивидуальные анимации 12 эмоций ещё не готовы.

Обновлены согласованные пары цвета корпуса/узора и освещение: меньше бледности, без случайных грязных сочетаний. Тот же seed, тип узора и базовый характер сохраняются. Физика, управление и свободная камера не перенастраивались.

17 тестов и production-build проходят; браузерные сценарии проверяют галерею, закрытые глаза, игру, сбор кольца и middle-mouse камеру. Коммерческая художественная готовность и FPS на телефоне не утверждаются.

## 0.1.0-dev.5 — 24.10.2026

По игровым скриншотам пользователя усилена читаемость лица: более крупные глаза и рты, светлые белки/зубы, тёплые янтарные радужки, коричневые брови и цветной интерьер рта. Узкие базовые раздражённые глаза стали открытее. Тонкий кант отделяет брови/закрытый рот от тёмного корпуса. При STUN/dizzy белки остаются светлыми без радужки: крестики и спирали больше не теряются в узоре.

Контраст рисунка корпуса смягчён; добавлены мягкое заполнение и слабая собственная подсветка материала, светлее трава/небо. Seed и параметры физики/камеры сохранены. В QA доступен `?art-review&lighting=shadow` для сравнения с фронтальным светом.

17 тестов, build и браузерные сценарии света/тени/закрытых глаз/сбора/камеры проходят; локальные скриншоты проверены визуально. Производительность на реальном телефоне не измерялась.

## 0.1.0-dev.6 — face proportions
- Restored eye dominance relative to the mouth; raised eye line and lowered and limited the mouth.
- Reserved at least 0.08 sphere radii between eye and mouth geometry in all 12 poses; regression test includes impact.
- Original reference artwork remains the visual target, not a claim of final atlas quality.

## 0.1.0-dev.7 — compact expressive face and gentle patterns
- Chunky independent curved 3D brows replace thin atlas brows; no pale outline.
- Compact lower face assembly tilts up/down with expression, independently of body rolling.
- Fine seeded dots, hearts and petals replace broad stripes without rerolling identity.
- Environment art and final visual approval remain pending; controls/physics unchanged.

## Isolated three-expression sprite study
- Added read-only `?face-study` with one teal character, three expressions and new independent RGBA parts.
- Added front/¾, light/shadow, rolling, blink, reaction controls and ~80px samples.
- Main gameplay art remains unchanged pending visual review; simulated reaction is not a collision test.

## Face layout editor
- Added explicitly requested authoring tool at `?face-editor`: drag individual/paired features, width/height, overall scale, undo, front/¾ and lighting.
- Added local save, validated JSON import/export and PNG download; gameplay and saved skin remain separate.
- Browser verification covers drag/resize, save/reload and JSON/PNG roundtrip; calibration is static, animation integration follows accepted layout.

## 2026-10-25 — user-authored face calibration
- Preserved exact cumulative JSON supplied by user: happy, sly, grumpy.
- Sample/editor defaults now use user calibration without an additional pitch offset.
- Brows draw over eyes/lids, while sphere depth occlusion remains enabled, in sample/editor and legacy gameplay rig.
- Closed lid curves follow edited eye coordinates.

## 0.1.0-dev.8 — approved faces in gameplay
- Main player and HUD use three approved sprite poses and exact user-authored proportions.
- Wired jump/ring/dash, independent blink, heading and temporary impact/stun recovery.
- Preserved rolling body, stored seed/mood, controls and physics. Worried/shock use happy as temporary art until additional poses are approved.
- Added game-face state/geometry tests and browser test of actual jump, physical landing stun, dash and recovery.

## Animation atlas preview
- New modular WebP/JSON parts atlas with 12 emotions plus distinct knockout; original three calibrated poses preserved.
- New small-iris eyes for scared/shocked/dazed, optional left/right gaze, and reduced viewer-left unhinged iris/pupil.
- One-shot keyframe clips, independent blink, 3-turn face orbit with trails, dizzy body-stop/rocking preview and recovery.
- Added `?face-animations`; gameplay event/physics integration remains separate. KO mouth is marked temporary, awaiting user's requested broken-line redraw.

### 25.10.2026 — сознательное оглушение, предварительный просмотр
- Маленькая орбита взгляда внутри глаз, три пробные звёздочки с возвратом к базовому выражению.
- Удивление смотрит прямо при любом выборе направления взгляда.
- 30 Node-тестов и production build проходят; положение звёздочек предварительное.

### 25.10.2026 — открытые глаза оглушённого
- Испуг получил глаза удивления со взглядом прямо.
- У сознательного оглушения оба глаза открыты; малая орбита взгляда и звёздочки сохранены.

### 25.10.2026 — авторский просмотр скинов
- `?skin-study`: 12 узоров, однотон, независимые цвета/масштаб/плотность/разброс, чешуя и сегменты, 0–240 объёмных наростов.
- Три согласованных мордочки, качение, ракурсы, свет/тень и уменьшенный игровой размер.
- Отдельное авторское сохранение, проверяемый импорт/экспорт JSON, снимок PNG; игровой seed сохраняется.
- Исправлены остатки соседних бровей у гордости в просмотре анимаций.

### 25.10.2026 — объёмные неровные ячейки
- Чешуя и сегменты строятся отдельными ячейками с частично случайной глубиной/наклоном и тенями.
- Геодезическое распределение убирает стяжку фактуры к полюсам.
- Фактурные образцы пока однотонные; правила совместимости с узорами будут согласованы позже.

### 25.10.2026 — размер лица в просмотре скинов
- Вся композиция sly/happy/grumpy уменьшена на 10% вокруг прежнего центра, включая промежутки между органами; посадка пересчитана на сферу.
- Основной игровой FaceRig и исходный approved-layout.json пока не изменены.

### 25.10.2026 — пушок и молнии в авторском просмотре
- Пробные поверхности «Рваный пушок» и «Лохматые клочки»: 1–160 пучков, длина и растрёпанность.
- Новый двухцветный рисунок №13 «Молнии» для гладкого корпуса.
- Обратная совместимость авторских JSON; игровой seed не меняется.

### 25.10.2026 — завершение подборки узоров
- Полностью переработаны тигровые полосы; добавлены «Зебра» и «Жираф», исправлены коровьи пятна и леопардовые розетки.
- Равномерное размещение одинаковых мотивов по сфере.
- Регулируемый глянцевый блеск гладкого корпуса без наростов, с процедурными студийными отражениями.
- Новые настройки сохраняются в авторский JSON; старые файлы совместимы.

### 25.10.2026 — направление комбо
- Лицо и следы в просмотре анимаций обегают шар по вертикальной окружности; три оборота и дальнейшее головокружение сохранены.
- В план косметики добавлены головные уборы и декоративные рожки с независимым креплением.
