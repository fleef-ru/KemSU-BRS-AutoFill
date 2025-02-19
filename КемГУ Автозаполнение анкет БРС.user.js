// ==UserScript==
// @name         КемГУ Автозаполнение анкет БРС
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Автоматическое заполнение анкет БРС в КемГУ
// @author       Maksim Menshikov
// @match        https://eios.kemsu.ru/a/anketa-to-bsod
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Создаем и добавляем стили
    const style = document.createElement('style');
    style.textContent = `
        .auto-fill-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            min-width: 200px;
        }
        .auto-fill-button {
            padding: 12px 24px;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            transition: all 0.3s ease;
        }
        .auto-fill-button:hover {
            background: #1976D2;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        }
        .auto-fill-button:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        .progress-text {
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            display: none;
        }
        .rating-select {
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            width: 100%;
        }
        .rating-label {
            font-size: 14px;
            color: #333;
            margin-bottom: 5px;
        }
    `;
    document.head.appendChild(style);

    // Создаем контейнер для элементов управления
    const container = document.createElement('div');
    container.className = 'auto-fill-container';

    // Создаем label и select для выбора оценки
    const label = document.createElement('label');
    label.className = 'rating-label';
    label.textContent = 'Выберите оценку:';

    const ratingSelect = document.createElement('select');
    ratingSelect.className = 'rating-select';
    for(let i = 5; i >= 0; i--) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        ratingSelect.appendChild(option);
    }

    const button = document.createElement('button');
    button.className = 'auto-fill-button';
    button.textContent = 'Заполнить анкеты';

    const progressText = document.createElement('div');
    progressText.className = 'progress-text';

    container.appendChild(label);
    container.appendChild(ratingSelect);
    container.appendChild(button);
    container.appendChild(progressText);
    document.body.appendChild(container);

    // Функция для установки выбранной оценки для всех вопросов
    async function setAllRatings() {
        const selectedRating = ratingSelect.value;
        const ratingSelects = document.querySelectorAll('select[title="Выберите оценку"]');

        for (let select of ratingSelects) {
            select.scrollIntoView({ behavior: 'instant', block: 'center' });
            await new Promise(resolve => setTimeout(resolve, 200));

            if (!select.value) {
                select.value = selectedRating;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }

        const unfilledSelects = Array.from(ratingSelects).filter(select => !select.value);
        if (unfilledSelects.length > 0) {
            updateProgress(`Остались незаполненные селекты: ${unfilledSelects.length}. Повторная попытка...`);
            await new Promise(resolve => setTimeout(resolve, 500));
            return await setAllRatings();
        }
    }

    // Функция обновления текста прогресса
    function updateProgress(text) {
        progressText.style.display = 'block';
        progressText.textContent = text;
    }

    // Функция для обработки всех дисциплин
    async function processAllDisciplines() {
        button.disabled = true;
        button.textContent = 'Заполнение...';
        ratingSelect.disabled = true;

        const disciplineSelect = document.querySelector('.form-control.form-control-sm');

        if (!disciplineSelect) {
            updateProgress('Селект с дисциплинами не найден');
            return;
        }

        const options = Array.from(disciplineSelect.options);
        const totalDisciplines = options.length - 1;
        let processedDisciplines = 0;

        for (let i = 1; i < options.length; i++) {
            if (!options[i].textContent.includes('отв. 10 из 10')) {
                updateProgress(`Обработка ${processedDisciplines + 1}/${totalDisciplines}: ${options[i].textContent}`);

                disciplineSelect.scrollIntoView({ behavior: 'instant', block: 'center' });
                disciplineSelect.value = options[i].value;
                disciplineSelect.dispatchEvent(new Event('change', { bubbles: true }));

                await new Promise(resolve => setTimeout(resolve, 2500));
                await setAllRatings();

                const ratingSelects = document.querySelectorAll('select[title="Выберите оценку"]');
                const unfilledSelects = Array.from(ratingSelects).filter(select => !select.value);

                if (unfilledSelects.length > 0) {
                    updateProgress(`Повторная попытка для: ${options[i].textContent}`);
                    i--;
                    continue;
                }

                processedDisciplines++;
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        updateProgress('Заполнение завершено!');
        button.disabled = false;
        button.textContent = 'Заполнить анкеты';
        ratingSelect.disabled = false;

        setTimeout(() => {
            progressText.style.display = 'none';
        }, 3000);
    }

    // Добавляем обработчик клика на кнопку
    button.addEventListener('click', () => {
        processAllDisciplines().catch(error => {
            console.error('Ошибка:', error);
            updateProgress('Произошла ошибка при заполнении');
            button.disabled = false;
            ratingSelect.disabled = false;
            button.textContent = 'Заполнить анкеты';
        });
    });
})();
