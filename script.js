// Importuj potrzebne funkcje z SDK Firebase v9+
// Używamy bezpośrednich linków CDN, aby uniknąć konieczności używania narzędzi budowania (npm, webpack)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js"; // Użyj aktualnej wersji v9 lub tej, którą chcesz
import { getDatabase, ref, onValue, push, remove, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";
// getAnalytics jest opcjonalne, jeśli go nie używasz, możesz usunąć ten import i wywołanie poniżej
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-analytics.js";


// Twoja konfiguracja Firebase (wklejona przez Ciebie)
const firebaseConfig = {
  apiKey: "AIzaSyDrIYX35tUW9MilvbrKx3InJA31nmYoDSc", // Twoje dane
  authDomain: "szachybase.firebaseapp.com",          // Twoje dane
  databaseURL: "https://szachybase-default-rtdb.europe-west1.firebasedatabase.app", // Twoje dane
  projectId: "szachybase",                         // Twoje dane
  storageBucket: "szachybase.firebasestorage.app", // Twoje dane - literówka poprawiona na storage
  messagingSenderId: "933829399000",               // Twoje dane
  appId: "1:933829399000:web:a682adbbc97b4c8a0862ad", // Twoje dane
  measurementId: "G-S9C816M0PW"                    // Twoje dane
};

// Zainicjuj Firebase
const app = initializeApp(firebaseConfig);

// Zainicjuj Analytics (opcjonalnie, usuń jeśli nie potrzebujesz)
const analytics = getAnalytics(app);

// Uzyskaj referencję do usługi Realtime Database
const database = getDatabase(app);

// --- Hasło Administratora (Nadal Niebezpieczne w Frontendzie!) ---
const ADMIN_PASSWORD = 'TwojeTajneHaslo123'; // ZASTĄP NA WŁASNE
// ---

// Poczekaj na załadowanie DOM
document.addEventListener('DOMContentLoaded', () => {
    // Referencje do elementów DOM
    const scoreForm = document.getElementById('add-score-form');
    const scoresTbody = document.getElementById('scores-tbody');
    const dateInput = document.getElementById('game-date');
    const registeredByInput = document.getElementById('registered-by'); // Upewnij się, że to pole istnieje w HTML

    // Podstawowe sprawdzenie istnienia elementów
    if (!scoreForm || !scoresTbody || !dateInput || !registeredByInput) {
        console.error("Brak kluczowych elementów DOM. Sprawdź ID w HTML.");
        alert("Błąd inicjalizacji interfejsu. Sprawdź konsolę.");
        return;
    }

    // Referencja do węzła 'scores' w bazie danych (styl v9)
    const scoresRef = ref(database, 'scores');

    // --- Funkcje Pomocnicze ---
    const setTodayDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        dateInput.value = `${year}-${month}-${day}`;
    };

    // --- Renderowanie Danych ---
    const renderScores = (scoresArray) => {
        scoresTbody.innerHTML = '';
        scoresArray.sort((a, b) => new Date(b.date) - new Date(a.date)); // Sortuj

        if (scoresArray.length === 0) {
             scoresTbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Brak zapisanych partii.</td></tr>'; // Colspan 7
             return;
        }

        scoresArray.forEach((score) => {
            if(!score || typeof score !== 'object' || !score.id) {
                 console.warn("Pominięto nieprawidłowy wpis:", score); return;
            }
            const row = scoresTbody.insertRow();
            row.insertCell(0).textContent = score.date || '?';
            row.insertCell(1).textContent = score.white || '?';
            row.insertCell(2).textContent = score.black || '?';
            row.insertCell(3).textContent = score.result || '?';
            const notesCell = row.insertCell(4);
            notesCell.textContent = score.notes || '-';
            notesCell.style.whiteSpace = 'pre-wrap';
            row.insertCell(5).textContent = score.registeredBy || '?'; // Osoba rejestrująca
            const actionCell = row.insertCell(6); // Komórka akcji
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Usuń';
            deleteBtn.classList.add('delete-btn');
            deleteBtn.onclick = () => requestPasswordAndDelete(score.id); // Przekaż ID (klucz Firebase)
            actionCell.appendChild(deleteBtn);
        });
    };

    // --- Operacje CRUD v9 ---

    // CZYTANIE v9: Użyj onValue do nasłuchiwania zmian
    onValue(scoresRef, (snapshot) => {
        const scoresData = snapshot.val();
        const scoresArray = [];
        if (scoresData) {
            // Przekształć obiekt na tablicę
            for (const key in scoresData) {
                scoresArray.push({ id: key, ...scoresData[key] });
            }
        }
        renderScores(scoresArray); // Wyrenderuj dane
    }, (error) => {
        console.error("Błąd odczytu z Firebase (v9):", error);
        alert("Nie można załadować danych z bazy. Sprawdź Reguły Bezpieczeństwa i połączenie.");
    });

    // TWORZENIE v9: Użyj push
    const addScore = (event) => {
        event.preventDefault();
        const whitePlayer = document.getElementById('white-player').value.trim();
        const blackPlayer = document.getElementById('black-player').value.trim();
        const result = document.getElementById('result').value;
        const gameDate = dateInput.value;
        const notes = document.getElementById('notes').value.trim();
        const registeredBy = registeredByInput.value.trim();

        if (!whitePlayer || !blackPlayer || !result || !gameDate || !registeredBy) {
            alert("Proszę wypełnić wszystkie wymagane pola."); return;
        }

        const newScoreData = {
            white: whitePlayer,
            black: blackPlayer,
            result: result,
            date: gameDate,
            notes: notes,
            registeredBy: registeredBy,
            // timestamp: serverTimestamp() // Opcjonalnie: Dodaj timestamp serwera
        };

        push(scoresRef, newScoreData) // Użyj push() v9
            .then(() => {
                console.log("Wpis dodany (v9).");
                scoreForm.reset();
                setTodayDate();
            })
            .catch((error) => {
                console.error("Błąd zapisu (v9):", error);
                alert("Nie udało się zapisać wyniku. Sprawdź Reguły Bezpieczeństwa.");
            });
    };

    // USUWANIE v9:
    const requestPasswordAndDelete = (idToDelete) => {
        const enteredPassword = prompt("Aby usunąć, wprowadź hasło administratora:");
        if (enteredPassword === ADMIN_PASSWORD) { // Niebezpieczne!
             deleteScoreFromFirebase(idToDelete);
        } else if (enteredPassword !== null) {
             alert("Nieprawidłowe hasło!");
        }
    };

    const deleteScoreFromFirebase = (idToDelete) => {
        if (!idToDelete) { console.error("Brak ID do usunięcia."); return; }
        // Utwórz referencję do konkretnego wpisu (styl v9)
        const scoreToDeleteRef = ref(database, 'scores/' + idToDelete);
        remove(scoreToDeleteRef) // Użyj remove() v9
            .then(() => {
                console.log(`Usunięto wpis ${idToDelete} (v9).`);
            })
            .catch((error) => {
                console.error(`Błąd podczas usuwania wpisu ${idToDelete} (v9):`, error);
                alert("Nie udało się usunąć wpisu.");
            });
    };

    // --- Inicjalizacja ---
    setTodayDate(); // Ustaw datę w formularzu
    scoreForm.addEventListener('submit', addScore); // Dodaj listener do formularza
    console.log("Notatnik Szachowy (Firebase v9) zainicjalizowany.");

}); // Koniec DOMContentLoaded