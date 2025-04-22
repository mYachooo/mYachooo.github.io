document.addEventListener('DOMContentLoaded', () => {
    const scoreForm = document.getElementById('add-score-form');
    const scoresTbody = document.getElementById('scores-tbody');
    const dateInput = document.getElementById('game-date');

    const storageKey = 'chessScores';
    // --- !!! WAŻNE !!! ---
    // Zmień to hasło na własne. Pamiętaj, że jest ono widoczne w kodzie źródłowym strony.
    const ADMIN_PASSWORD = 'Szachy123';
    // --- !!! WAŻNE !!! ---

    // Funkcja do ładowania wyników z localStorage
    const loadScores = () => {
        const scoresJSON = localStorage.getItem(storageKey);
        try {
            return scoresJSON ? JSON.parse(scoresJSON) : [];
        } catch (e) {
            console.error("Błąd parsowania danych z localStorage:", e);
            // Można rozważyć usunięcie błędnych danych
            // localStorage.removeItem(storageKey);
            return [];
        }
    };

    // Funkcja do zapisywania wyników w localStorage
    const saveScores = (scores) => {
         try {
            const scoresJSON = JSON.stringify(scores);
            localStorage.setItem(storageKey, scoresJSON);
         } catch (e) {
             console.error("Błąd zapisu do localStorage:", e);
             alert("Nie udało się zapisać danych. Pamięć przeglądarki może być pełna lub zablokowana.");
         }
    };

    // Funkcja do renderowania (wyświetlania) wyników w tabeli
    const renderScores = (scores) => {
        if (!scoresTbody) {
            console.error("Nie znaleziono elementu tbody tabeli!");
            return;
        }
        scoresTbody.innerHTML = '';

        // Sortuj wyniki od najnowszej daty (malejąco)
        scores.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (scores.length === 0) {
             scoresTbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Brak zapisanych partii.</td></tr>';
             return;
        }

        scores.forEach((score) => {
             if(!score || typeof score !== 'object') {
                 console.warn("Pominięto nieprawidłowy wpis:", score);
                 return;
             }
            const row = scoresTbody.insertRow();

            row.insertCell(0).textContent = score.date || 'brak daty';
            row.insertCell(1).textContent = score.white || 'brak gracza';
            row.insertCell(2).textContent = score.black || 'brak gracza';
            row.insertCell(3).textContent = score.result || 'brak wyniku';
            const notesCell = row.insertCell(4);
            notesCell.textContent = score.notes || '-';
            notesCell.style.whiteSpace = 'pre-wrap';

            const actionCell = row.insertCell(5);
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Usuń';
            deleteBtn.classList.add('delete-btn');
            if (score.id === undefined) {
                 console.error("Brak ID dla wpisu:", score);
                 deleteBtn.disabled = true;
            } else {
                 // Zmieniamy wywołanie - teraz przekazujemy ID do funkcji usuwającej
                 deleteBtn.onclick = () => requestPasswordAndDelete(score.id);
            }
            actionCell.appendChild(deleteBtn);
        });
    };

    // NOWA funkcja prosząca o hasło przed usunięciem
    const requestPasswordAndDelete = (idToDelete) => {
        const enteredPassword = prompt("Aby usunąć, wprowadź hasło administratora:");

        // Sprawdź, czy użytkownik coś wpisał i czy hasło jest poprawne
        if (enteredPassword === ADMIN_PASSWORD) {
            // Hasło poprawne - wywołaj właściwą funkcję usuwania
            deleteScore(idToDelete);
        } else if (enteredPassword !== null) {
            // Użytkownik wpisał hasło, ale jest niepoprawne (sprawdzamy !== null, żeby nie pokazywać alertu po kliknięciu Anuluj)
            alert("Nieprawidłowe hasło!");
        }
        // Jeśli użytkownik kliknął Anuluj (enteredPassword === null), nic nie rób
    };

     // ZAKTUALIZOWANA funkcja usuwania - teraz tylko usuwa, nie pyta o hasło
     const deleteScore = (idToDelete) => {
        if (idToDelete === undefined) {
            console.error("Próba usunięcia wpisu bez ID.");
            return;
        }
        // Usunęliśmy confirm(), bo weryfikacja jest w requestPasswordAndDelete
        let scores = loadScores();
        scores = scores.filter(score => score.id !== idToDelete);
        saveScores(scores);
        renderScores(scores); // Odśwież widok tabeli
        console.log(`Usunięto wpis o ID: ${idToDelete}`); // Opcjonalny log dla dewelopera
    };


    // Funkcja do dodawania nowego wyniku (bez zmian)
    const addScore = (event) => {
        event.preventDefault();

        const whitePlayer = document.getElementById('white-player').value.trim();
        const blackPlayer = document.getElementById('black-player').value.trim();
        const result = document.getElementById('result').value;
        const gameDate = dateInput.value;
        const notes = document.getElementById('notes').value.trim();

        if (!gameDate) {
            alert("Proszę wybrać datę partii.");
            return;
        }

        const newScore = {
            id: Date.now(),
            white: whitePlayer,
            black: blackPlayer,
            result: result,
            date: gameDate,
            notes: notes
        };

        const scores = loadScores();
        scores.push(newScore);
        saveScores(scores);
        renderScores(scores);

        scoreForm.reset();
        setTodayDate();
    };

    // Funkcja ustawiająca dzisiejszą datę w polu input date (bez zmian)
    const setTodayDate = () => {
         if (!dateInput) return;
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        dateInput.value = `${year}-${month}-${day}`;
    };

    // --- Inicjalizacja Aplikacji ---
    setTodayDate();
    const initialScores = loadScores();
    renderScores(initialScores);

    if (scoreForm) {
        scoreForm.addEventListener('submit', addScore);
    } else {
        console.error("Nie znaleziono formularza 'add-score-form'");
    }
});