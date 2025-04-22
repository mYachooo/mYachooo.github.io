// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDrIYX35tUW9MilvbrKx3InJA31nmYoDSc",
  authDomain: "szachybase.firebaseapp.com",
  databaseURL: "https://szachybase-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "szachybase",
  storageBucket: "szachybase.firebasestorage.app",
  messagingSenderId: "933829399000",
  appId: "1:933829399000:web:a682adbbc97b4c8a0862ad",
  measurementId: "G-S9C816M0PW"
};


  // 2. Zainicjuj Firebase
  firebase.initializeApp(firebaseConfig);
  
  // 3. Uzyskaj referencję do usługi Realtime Database
  const database = firebase.database();
  
  // --- !!! WAŻNE - Hasło Administratora !!! ---
  // Zmień to hasło na własne. Pamiętaj, że jest ono widoczne w kodzie źródłowym strony
  // i NIE jest to bezpieczne rozwiązanie w środowisku produkcyjnym.
  const ADMIN_PASSWORD = 'TwojeTajneHaslo123'; // ZASTĄP NA WŁASNE
  // --- !!! WAŻNE !!! ---
  
  
  document.addEventListener('DOMContentLoaded', () => {
      // Referencje do elementów DOM
      const scoreForm = document.getElementById('add-score-form');
      const scoresTbody = document.getElementById('scores-tbody');
      const dateInput = document.getElementById('game-date');
      // Pole osoby rejestrującej - upewnij się, że masz je w HTML z id="registered-by"
      const registeredByInput = document.getElementById('registered-by');
  
      // Sprawdzenie, czy elementy DOM istnieją
      if (!scoreForm || !scoresTbody || !dateInput || !registeredByInput) {
          console.error("Nie znaleziono jednego lub więcej wymaganych elementów DOM!");
          alert("Wystąpił błąd inicjalizacji aplikacji. Sprawdź konsolę.");
          return;
      }
  
      // Referencja do głównego węzła 'scores' w Firebase
      const scoresRef = database.ref('scores');
  
      // --- Funkcje Pomocnicze ---
  
      // Funkcja ustawiająca dzisiejszą datę w polu input date
      const setTodayDate = () => {
          const today = new Date();
          const year = today.getFullYear();
          const month = String(today.getMonth() + 1).padStart(2, '0');
          const day = String(today.getDate()).padStart(2, '0');
          dateInput.value = `${year}-${month}-${day}`;
      };
  
      // --- Renderowanie Danych ---
  
      // Funkcja do renderowania (wyświetlania) wyników w tabeli
      const renderScores = (scoresArray) => {
          scoresTbody.innerHTML = ''; // Wyczyść obecną zawartość tabeli
  
          // Sortuj wyniki od najnowszej daty (malejąco)
          scoresArray.sort((a, b) => new Date(b.date) - new Date(a.date));
  
          if (scoresArray.length === 0) {
               // Colspan = 7 ze względu na nową kolumnę "Zarejestrował"
               scoresTbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Brak zapisanych partii.</td></tr>';
               return;
          }
  
          // Dla każdego wyniku w tablicy stwórz nowy wiersz w tabeli
          scoresArray.forEach((score) => {
               if(!score || typeof score !== 'object' || !score.id) {
                   console.warn("Pominięto nieprawidłowy wpis z bazy danych:", score);
                   return; // Pomiń ten wpis jeśli jest niekompletny
               }
              const row = scoresTbody.insertRow();
  
              row.insertCell(0).textContent = score.date || 'brak daty';
              row.insertCell(1).textContent = score.white || 'brak gracza';
              row.insertCell(2).textContent = score.black || 'brak gracza';
              row.insertCell(3).textContent = score.result || 'brak wyniku';
              const notesCell = row.insertCell(4);
              notesCell.textContent = score.notes || '-';
              notesCell.style.whiteSpace = 'pre-wrap';
              // NOWA KOMÓRKA: Osoba rejestrująca
              row.insertCell(5).textContent = score.registeredBy || '?';
  
              // Komórka Akcji
              const actionCell = row.insertCell(6);
              const deleteBtn = document.createElement('button');
              deleteBtn.textContent = 'Usuń';
              deleteBtn.classList.add('delete-btn');
              // Przekazujemy ID (klucz Firebase) do funkcji usuwającej
              deleteBtn.onclick = () => requestPasswordAndDelete(score.id);
              actionCell.appendChild(deleteBtn);
          });
      };
  
      // --- Operacje CRUD (Create, Read, Update, Delete) na Firebase ---
  
      // CZYTANIE: Nasłuchuj na zmiany w węźle 'scores'
      scoresRef.on('value', (snapshot) => {
          const scoresData = snapshot.val(); // Pobierz dane jako obiekt { key1: value1, key2: value2 }
          const scoresArray = [];
  
          if (scoresData) {
              // Przekształć obiekt z Firebase na tablicę obiektów, dodając ID (klucz Firebase)
              for (const key in scoresData) {
                  scoresArray.push({
                      id: key, // Klucz Firebase staje się naszym ID
                      ...scoresData[key] // Skopiuj resztę danych (white, black, etc.)
                  });
              }
          }
          // Przekaż przetworzoną tablicę do funkcji renderującej
          renderScores(scoresArray);
  
      }, (error) => {
          console.error("Błąd odczytu z Firebase Realtime Database:", error);
          alert("Nie można załadować danych z bazy. Sprawdź połączenie i reguły bezpieczeństwa Firebase.");
      });
  
  
      // TWORZENIE (CREATE): Funkcja dodająca nowy wynik do Firebase
      const addScore = (event) => {
          event.preventDefault(); // Zapobiegaj domyślnej akcji formularza
  
          // Pobierz wartości z pól formularza
          const whitePlayer = document.getElementById('white-player').value.trim();
          const blackPlayer = document.getElementById('black-player').value.trim();
          const result = document.getElementById('result').value;
          const gameDate = dateInput.value;
          const notes = document.getElementById('notes').value.trim();
          const registeredBy = registeredByInput.value.trim(); // Pobierz nowe pole
  
          // Prosta walidacja
          if (!whitePlayer || !blackPlayer || !result || !gameDate || !registeredBy) {
              alert("Proszę wypełnić wszystkie wymagane pola (Białe, Czarne, Wynik, Data, Osoba rejestrująca).");
              return;
          }
  
          // Przygotuj obiekt danych do wysłania (bez ID - Firebase je wygeneruje)
          const newScoreData = {
              white: whitePlayer,
              black: blackPlayer,
              result: result,
              date: gameDate,
              notes: notes,
              registeredBy: registeredBy,
              // Opcjonalnie: Można dodać timestamp serwera
              // timestamp: firebase.database.ServerValue.TIMESTAMP
          };
  
          // Wyślij dane do Firebase używając push() - wygeneruje unikalny klucz
          scoresRef.push(newScoreData)
              .then(() => {
                  console.log("Wpis dodany do Firebase.");
                  // Wyczyść formularz po pomyślnym dodaniu
                  scoreForm.reset();
                  setTodayDate(); // Ustaw dzisiejszą datę z powrotem
              })
              .catch((error) => {
                  console.error("Błąd zapisu do Firebase:", error);
                  alert("Nie udało się zapisać wyniku w bazie danych. Sprawdź reguły bezpieczeństwa i połączenie.");
              });
      };
  
  
      // USUWANIE (DELETE): Funkcja prosząca o hasło przed usunięciem
      const requestPasswordAndDelete = (idToDelete) => {
          const enteredPassword = prompt("Aby usunąć, wprowadź hasło administratora:");
  
          // UWAGA: Porównanie hasła po stronie klienta jest NIEBEZPIECZNE!
          if (enteredPassword === ADMIN_PASSWORD) {
              // Hasło (lokalnie) poprawne - wywołaj funkcję usuwającą z Firebase
              deleteScoreFromFirebase(idToDelete);
          } else if (enteredPassword !== null) { // Jeśli użytkownik coś wpisał, ale błędnie
              alert("Nieprawidłowe hasło!");
          }
          // Jeśli kliknął Anuluj (enteredPassword === null), nic nie rób
      };
  
      // USUWANIE (DELETE): Funkcja faktycznie usuwająca wpis z Firebase
      const deleteScoreFromFirebase = (idToDelete) => {
          if (!idToDelete) {
              console.error("Próba usunięcia wpisu bez ID.");
              return;
          }
  
          // Utwórz referencję do konkretnego wpisu i go usuń
          database.ref('scores/' + idToDelete).remove()
              .then(() => {
                  console.log(`Usunięto wpis o ID: ${idToDelete} z Firebase.`);
                  // Nie trzeba ręcznie renderować, listener .on('value', ...) zrobi to automatycznie
              })
              .catch((error) => {
                  console.error(`Błąd podczas usuwania wpisu ${idToDelete} z Firebase:`, error);
                  alert("Nie udało się usunąć wpisu z bazy danych.");
              });
      };
  
      // --- Inicjalizacja Aplikacji ---
  
      // Ustaw dzisiejszą datę w formularzu przy starcie
      setTodayDate();
  
      // Dodaj listener do formularza
      scoreForm.addEventListener('submit', addScore);
  
      console.log("Notatnik Szachowy (Firebase) zainicjalizowany.");
  
  }); // Koniec DOMContentLoaded