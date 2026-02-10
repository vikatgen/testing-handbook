# Päev 2 – Praktiline töötuba (ülesanded)

## Enne alustamist

Veendu, et:

- Docker töötab
- Node.js >= 18
- Projekt on kloonitud
- `.env` ja `.env.test` on olemas

Käivita andmebaasid:

```bash
docker compose up -d
```

Käivita migratsioonid:

```bash
npx prisma migrate dev
npm run migrate:test
```

Käivita rakendus:

```bash
npm run dev
```

Swagger dokumentatsioon: `http://localhost:3000/docs`

Käivita testid:

```bash
npm test
```

Testid kasutavad `.env.test` faili ja ühenduvad test-andmebaasiga.

---

Te töötate paarides.
Rollivahetus iga ~40 min.

---

# 1. Baastase (kõik paarid)

## 1.1 Integration test: GET /health

Kirjutage integration test:
- GET /health
- Kontrollige status 200

## 1.2 Integration test: POST /users

Kirjutage integration test:
- POST /users (happy path)
- POST /users (vale sisend → 400)

## 1.3 Andmebaasi cleanup

Lisage `beforeEach()` mis puhastab test-andmebaasi.

---

# 2. Kesktase

## 2.1 POST /workshops

Kirjutage integration test:
- POST /workshops
- capacity peab olema > 0

## 2.2 POST /bookings (happy path)

Kirjutage integration test:
- POST /bookings (happy path)

## 2.3 Workshop täis

Kirjutage test:
- POST /bookings kui workshop on täis → 409

## 2.4 Error response kontroll

Kirjutage test mis kontrollib, et error vastuse struktuur on:

```json
{
  "error": "...",
  "message": "..."
}
```

---

# 3. Edasijõudnud (vanemad)

## 3.1 Transaktsioonid

Muuda booking endpoint nii, et:
- Kasutab Prisma `$transaction`
- Loeb workshop capacity
- Loob booking samas transaktsioonis

Arutelu:
- Mis juhtub, kui kaks requesti tulevad samaaegselt?
- Kas meie praegune loogika on concurrency-safe?

## 3.2 Concurrency test (mõtteharjutus)

Kirjuta test, mis:
- Teeb kaks POST /bookings päringut järjest
- Kontrollib, et ainult üks õnnestub

## 3.3 API kontrakti kontroll

Testige, et API vastab Swaggeris defineeritud vastusele.

Arutelu:
- Mis juhtub, kui backend muudab response struktuuri?
- Kuidas frontend saab teada, et API muutus?

Swagger on API contract.

Allikas: https://swagger.io/specification/

## 3.4 Swaggeri täiendamine

Täienda `openapi.yaml`:
- Lisa vastuste schema
- Lisa error response schema

Näide:

```yaml
components:
  schemas:
    ErrorResponse:
      type: object
      properties:
        error:
          type: string
        message:
          type: string
```

---

# 4. Noorematele sobiv laiendus

## Lisa GET /workshops endpoint

1. Tagasta kõik workshopid
2. Kirjuta integration test
3. Lisa Swagger dokumentatsiooni vastus

---

# 5. Arhitektuuriline refleksioon

Küsimused:

- Kus toimub äriloogika?
- Kas route fail peaks sisaldama loogikat?
- Kas booking loogika võiks olla Service kihis?
- Kuidas see mõjutab testitavust?

---

# 6. Päeva lõpu refleksioon

- Kas integration test oli keerulisem kui unit test?
- Kas Docker lisas keerukust või selgust?
- Kas Swagger aitas mõista API struktuuri?
- Kui palju testid suurendasid kindlustunnet?
- Kui palju teste oleks piisav enne deploy'd?
