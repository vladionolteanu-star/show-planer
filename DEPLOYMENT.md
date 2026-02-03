# 🚀 Ghid de Publicare (Deployment) - Show Planner

Acest document explică pas cu pas cum să publici aplicația pe internet, folosind servicii gratuite.

Aplicația este formată din două părți care trebuie publicate separat:
1.  **Backend** (Serverul Python/Flask) -> Recomandat: **Render.com**
2.  **Frontend** (Interfața React) -> Recomandat: **Vercel.com**

---

## Pasul 0: Pregătirea Codului pe GitHub

Asigură-te că ultima versiune a codului tău este urcată pe GitHub.
Link-ul tău: `https://github.com/vladionolteanu-star/show-planer`

Dacă ai modificări locale ne-urcate:
```bash
git add .
git commit -m "Pregatire deploy"
git push origin main
```

---

## Pasul 1: Publicare Backend (Render.com)

1.  Intră pe [Render.com](https://render.com) și fă-ți cont (poți folosi contul de GitHub).
2.  Click pe butoul **"New +"** și alege **"Web Service"**.
3.  Conectează contul de GitHub și alege repo-ul `show-planer`.
4.  Configurează următoarele:
    *   **Name:** `show-backend` (sau orice nume unic)
    *   **Region:** Alege `Frankfurt` (cea mai apropiată de România).
    *   **Root Directory:** Scrie `backend`.
    *   **Runtime:** `Python 3`.
    *   **Build Command:** `pip install -r requirements.txt`. (Render va citi automat acest fișier).
    *   **Start Command:** `gunicorn app:app`.
    *   **Plan:** Alege `Free`.
5.  Click **"Create Web Service"**.
6.  Așteaptă câteva minute până vezi "Live".
7.  **IMPORTANT:** Copiază adresa URL generată (ex: `https://show-backend.onrender.com`). O vei folosi la pasul următor.

---

## Pasul 2: Conectare Frontend la Backend

Înainte să publici Frontend-ul, trebuie să îi spui să folosească serverul online (Render), nu pe cel local (`localhost`).

1.  Deschide fișierul `frontend/src/App.jsx` pe calculatorul tău.
2.  Caută liniile unde se fac cereri `axios.get` (aprox. linia 73).
3.  Înlocuiește `http://127.0.0.1:5000` cu URL-ul de la Render.
    
    *Exemplu:*
    ```javascript
    // INAINTE:
    axios.get(`http://127.0.0.1:5000/api/events?city=${city.slug}`)

    // DUPA (exemplu):
    axios.get(`https://show-backend.onrender.com/api/events?city=${city.slug}`)
    ```
4.  Salvează fișierul, fă un commit și push:
    ```bash
    git add frontend/src/App.jsx
    git commit -m "Update API URL for production"
    git push origin main
    ```

---

## Pasul 3: Publicare Frontend (Vercel.com)

1.  Intră pe [Vercel.com](https://vercel.com) și fă-ți cont cu GitHub.
2.  Click pe **"Add New..."** -> **"Project"**.
3.  Alege `show-planer` și apasă **Import**.
4.  La **"Framework Preset"**, ar trebui să detecteze automat `Vite`.
5.  La **"Root Directory"**, apasă **Edit** și selectează folderul `frontend`. 
6.  Click **Deploy**.
7.  Așteaptă un minut. Când e gata, vei primi un link (ex: `https://show-planer.vercel.app`).

---

## 🎉 Felicitări!

Aplicația ta este acum live. Poți trimite link-ul de Vercel oricui!

### Note Importante:
*   Pe planul Free de la Render, serverul Backend "adoarme" dacă nu este folosit 15 minute. Când cineva intră pe site după o pauză, prima încărcare poate dura ~30-50 secunde până se trezește serverul.


Start-Process cmd -ArgumentList "/k cd backend && python app.py"; Start-Process cmd -ArgumentList "/k cd frontend && npm run dev"; Start-Sleep -s 5; Start-Process "http://localhost:5173"
Start-Process cmd -ArgumentList "/k cd backend && python app.py"; Start-Process cmd -ArgumentList "/k cd frontend && npm run dev"; Start-Sleep -s 5; Start-Process "http://localhost:5173"