// Importuj potrzebne funkcje z SDK Firebase v9+
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getDatabase, ref, onValue, push, remove } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";
// Importy dla Authentication
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
// getAnalytics jest opcjonalne
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-analytics.js";


// 1. KONFIGURACJA FIREBASE - Wklej tutaj swoje dane!
const firebaseConfig = {
  apiKey: "TWOJ_API_KEY", // ZASTĄP
  authDomain: "TWOJ_AUTH_DOMAIN.firebaseapp.com", // ZASTĄP
  databaseURL: "https://TWOJ_DATABASE_URL.firebaseio.com", // ZASTĄP
  projectId: "TWOJ_PROJECT_ID", // ZASTĄP
  storageBucket: "TWOJ_STORAGE_BUCKET.appspot.com", // ZASTĄP
  messagingSenderId: "TWOJ_MESSAGING_SENDER_ID", // ZASTĄP
  appId: "TWOJ_APP_ID", // ZASTĄP
  measurementId: "TWOJ_MEASUREMENT_ID" // ZASTĄP (opcjonalne)
};

// Zainicjuj Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app); // Odkomentuj jeśli używasz
const database = getDatabase(app);
// Zainicjuj Authentication
const auth = getAuth(app);

// --- Zmienne Globalne ---
let currentUser = null; // Przechowuje stan zalogowanego użytkownika
// 2. UID ADMINISTRATORA - Wklej tutaj UID z konsoli Firebase!
const ADMIN_UID = "UrixrbXqwKMNYJPjGYxM3SzBNSY2"; // ZASTĄP

// Poczekaj na załadowanie DOM
document.addEventListener('DOMContentLoaded', () => {
    // Referencje do elementów DOM
    const scoreForm = document.getElementById('add-score-form');
    const scoresTbody = document.getElementById('scores-tbody');
    const dateInput = document.getElementById('game-date');
    const registeredByInput = document.getElementById('registered-by'); // Upewnij się, że to pole istnieje w HTML
    // Referencje do elementów logowania
    const loginForm = document.getElementById('login-form');
    const logoutSection = document.getElementById('logout-section');
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const adminEmailInput = document.getElementById('admin-email');
    const adminPasswordInput = document.getElementById('admin-password');
    const userEmailSpan = document.getElementById('user-email');
    const authStatusP = document.getElementById('auth-status');

    // Podstawowe sprawdzenie istnienia elementów
    if (!scoreForm || !scoresTbody || !dateInput || !registeredByInput || !loginForm || !logoutSection || !loginButton || !logoutButton || !adminEmailInput || !adminPasswordInput || !userEmailSpan || !authStatusP) {
        console.error("Brak jednego lub więcej kluczowych elementów DOM. Sprawdź ID w HTML.");
        alert("Błąd inicjalizacji interfejsu. Sprawdź konsolę.");
        return;
    }

    // Referencja do węzła 'scores' w bazie danych
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
                 console.warn("Pominięto nieprawidłowy wpis z bazy danych:", score); return;
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

            // Pokaż przycisk Usuń tylko jeśli admin jest zalogowany
            if (currentUser && currentUser.uid === ADMIN_UID) {
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Usuń';
                deleteBtn.classList.add('delete-btn');
                // Wywołaj funkcję potwierdzenia przed usunięciem
                deleteBtn.onclick = () => confirmAndDelete(score.id);
                actionCell.appendChild(deleteBtn);
            } else {
                 actionCell.textContent = '-'; // Lub zostaw puste
            }
        });
    };

    // --- Funkcje Autoryzacji ---
    const handleLogin = () => {
        const email = adminEmailInput.value;
        const password = adminPasswordInput.value;
        if (!email || !password) {
            authStatusP.textContent = "Podaj email i hasło.";
            return;
        }
        authStatusP.textContent = "Logowanie...";
        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                console.log("Zalogowano pomyślnie:", userCredential.user.email);
                authStatusP.textContent = "";
                adminPasswordInput.value = "";
            })
            .catch((error) => {
                console.error("Błąd logowania:", error);
                authStatusP.textContent = `Błąd logowania: ${error.code} - ${error.message}`; // Pokaż kod błędu
            });
    };

    const handleLogout = () => {
        signOut(auth)
            .then(() => {
                console.log("Wylogowano pomyślnie.");
                authStatusP.textContent = "Wylogowano.";
            })
            .catch((error) => {
                console.error("Błąd wylogowania:", error);
                authStatusP.textContent = "Błąd podczas wylogowywania.";
            });
    };

    // --- Obserwator Stanu Autoryzacji ---
    onAuthStateChanged(auth, (user) => {
        currentUser = user; // Aktualizuj globalny stan
        if (user) {
            // Zalogowany
            console.log("Stan autoryzacji: Zalogowany jako", user.email, "UID:", user.uid);
            loginForm.style.display = 'none';
            logoutSection.style.display = 'block';
            userEmailSpan.textContent = user.email;
            if (user.uid !== ADMIN_UID) {
                 authStatusP.textContent = "Zalogowano, ale nie posiadasz uprawnień administratora.";
            } else {
                 authStatusP.textContent = ""; // Wyczyść status jeśli to admin
            }
        } else {
            // Wylogowany
            console.log("Stan autoryzacji: Wylogowany");
            loginForm.style.display = 'block';
            logoutSection.style.display = 'none';
            userEmailSpan.textContent = '';
            // Komunikat o wylogowaniu jest ustawiany przez handleLogout
        }
        // Przeładuj i przerysuj tabelę, aby uwzględnić zmianę stanu logowania (pokaż/ukryj przycisk usuń)
        // Używamy onValue z onlyOnce: true, aby pobrać tylko raz po zmianie stanu auth
        onValue(scoresRef, (snapshot) => {
             const scoresData = snapshot.val();
             const scoresArray = [];
             if (scoresData) {
                 for (const key in scoresData) { scoresArray.push({ id: key, ...scoresData[key] }); }
             }
             renderScores(scoresArray);
         }, { onlyOnce: true }); // Pobierz tylko raz
    });

    // --- Operacje CRUD v9 ---

    // CZYTANIE v9: Nasłuchuj na zmiany w czasie rzeczywistym (dla aktualizacji live)
    // onValue jest już używane w onAuthStateChanged, ale zostawiamy je tutaj
    // na wypadek, gdyby inny użytkownik dodał wpis - chcemy to zobaczyć live.
    onValue(scoresRef, (snapshot) => {
        const scoresData = snapshot.val();
        const scoresArray = [];
        if (scoresData) {
            for (const key in scoresData) { scoresArray.push({ id: key, ...scoresData[key] }); }
        }
        renderScores(scoresArray); // Renderuj przy każdej zmianie danych
    }, (error) => {
        console.error("Błąd odczytu live z Firebase (v9):", error);
        // Można dodać mniej nachalne powiadomienie o błędzie odczytu
    });

    // TWORZENIE v9: Dodawanie nowego wyniku
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

        console.log("Dane do zapisu:", newScoreData); // Logowanie danych przed wysłaniem

        push(scoresRef, newScoreData)
            .then(() => {
                console.log("Wpis dodany (v9).");
                scoreForm.reset();
                setTodayDate();
            })
            .catch((error) => {
                console.error("Błąd zapisu (v9):", error);
                alert("Nie udało się zapisać wyniku. Sprawdź Reguły Bezpieczeństwa i połączenie.");
            });
    };

    // USUWANIE v9: Funkcja potwierdzenia
    const confirmAndDelete = (idToDelete) => {
        // Wyświetl standardowe okno dialogowe przeglądarki
        const wantsToDelete = confirm("Czy na pewno chcesz usunąć ten wpis?");
        // Jeśli użytkownik kliknął "OK"
        if (wantsToDelete) {
            deleteScoreFromFirebase(idToDelete); // Wywołaj usunięcie
        } else {
            console.log("Anulowano usuwanie wpisu:", idToDelete);
        }
    };

    // USUWANIE v9: Funkcja usuwająca z Firebase
    const deleteScoreFromFirebase = (idToDelete) => {
        if (!idToDelete) { console.error("Brak ID do usunięcia."); return; }
        const scoreToDeleteRef = ref(database, 'scores/' + idToDelete);
        remove(scoreToDeleteRef)
            .then(() => {
                console.log(`Wysłano żądanie usunięcia wpisu ${idToDelete} (v9).`);
                // Nie trzeba renderować, onValue() zareaguje na zmianę
            })
            .catch((error) => {
                console.error(`Błąd podczas usuwania wpisu ${idToDelete} (v9):`, error);
                // Błąd może wynikać z braku uprawnień (Reguły Firebase)
                alert("Nie udało się usunąć wpisu. Możliwy brak uprawnień lub problem z połączeniem.");
            });
    };

    // --- Inicjalizacja ---
    setTodayDate(); // Ustaw datę w formularzu
    scoreForm.addEventListener('submit', addScore); // Dodaj listener do formularza
    // Dodaj listenery do przycisków logowania/wylogowania
    loginButton.addEventListener('click', handleLogin);
    logoutButton.addEventListener('click', handleLogout);

    console.log("Notatnik Szachowy (Firebase v9 + Auth) zainicjalizowany.");

}); // Koniec DOMContentLoaded
