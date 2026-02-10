# Päev 2 – API testimine, Docker ja test-andmebaas (praktiline töötuba)

## Päeva eesmärk

Tänane päev on 100% praktiline.

Me:

- Käivitame Node.js + Express + Prisma rakenduse
- Kasutame Dockerit PostgreSQL andmebaasi jaoks
- Seadistame eraldi test-andmebaasi
- Kirjutame integration teste Supertestiga
- Kasutame Swaggerit (OpenAPI) API lepinguna
- Rakendame testimisstrateegiat päris projektis

---

# 1. Enne alustamist

Veendu, et:

- Docker töötab
- Node.js >= 18
- Projekt on kloonitud
- `.env` ja `.env.test` on olemas

---

# 2. Andmebaasi käivitamine Dockeriga

Käivita:

```bash
docker compose up -d
```

See käivitab:

- `app_dev` andmebaasi (port 5432)
- `app_test` andmebaasi (port 5433)

---

## 2.1 Miks kaks andmebaasi?

Testid EI TOHI:

- rikkuda arenduse andmeid
- sõltuda eelmisest testist
- kasutada ebastabiilset keskkonda

Test-andmebaas tagab:

- determinismi
- isolatsiooni
- korduvkäivitatavuse

---

# 3. Prisma migratsioonid

Arenduse andmebaas:

```bash
npx prisma migrate dev
```

Test-andmebaas:

```bash
npm run migrate:test
```

Miks migratsioonid on olulised?

- Tagavad skeemi versioonihalduse
- Võimaldavad keskkondi sünkroonida
- On osa professionaalsest arendusprotsessist

Allikas:
https://www.prisma.io/docs/concepts/components/prisma-migrate

---

# 4. Rakenduse käivitamine

```bash
npm run dev
```

Swagger dokumentatsioon:

`http://localhost:3000/docs`

---

# 5. Integration testide käivitamine

```bash
npm test
```

Testid kasutavad `.env.test` faili ja ühenduvad test-andmebaasiga.

---

# 6. Integration test – mis see tegelikult tähendab?

Integration test:

- Käivitab Express rakenduse
- Teeb päris HTTP päringu
- Kasutab päris andmebaasi
- Kontrollib süsteemi koostööd

Näide:

```js
const res = await request(app)
  .post("/users")
  .send({ name: "Ada", email: "ada@test.com" });

expect(res.statusCode).toBe(201);
```

---

# 7. Ülesanded – Baastase (kõik paarid)

## 7.1 Lisa test

Kirjuta test:

- `POST /bookings`
- Kui kasutajat ei eksisteeri → 404

## 7.2 Lisa test

- Kui workshop ei eksisteeri → 404

## 7.3 Lisa test

- Kui request body on vale tüübiga → 400

Kontrolli, et vastuse struktuur on:

```json
{
  "error": "...",
  "message": "..."
}
```

---

# 8. Kesktase – API lepingu kontroll

## 8.1 Swaggeri täiendamine

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

## 8.2 Testi vastavust

Kirjuta test, mis kontrollib:

- Error response sisaldab alati `error` ja `message` välja

---

# 9. Test-andmebaasi puhastamine

Testides kasutatakse:

```js
beforeEach(async () => {
  await resetDb();
});
```

Miks see on oluline?

- Testid peavad olema iseseisvad
- Testid ei tohi sõltuda järjekorrast

See on testide isolatsiooni põhimõte.

Allikas:
https://martinfowler.com/bliki/TestIsolation.html

---

# 10. Edasijõudnud ülesanded (vanemad)

## 10.1 Transaktsioonid

Muuda booking endpoint nii, et:

- Kasutab Prisma `$transaction`
- Loeb workshop capacity
- Loob booking samas transaktsioonis

Arutelu:

- Mis juhtub, kui kaks requesti tulevad samaaegselt?
- Kas meie praegune loogika on concurrency-safe?

---

## 10.2 Concurrency test (mõtteharjutus)

Kirjuta test, mis:

- Teeb kaks POST /bookings päringut järjest
- Kontrollib, et ainult üks õnnestub

---

## 10.3 API kontrakti kontroll

Arutelu:

- Mis juhtub, kui backend muudab response struktuuri?
- Kuidas frontend saab teada, et API muutus?

Swagger on API contract.

Allikas:
https://swagger.io/specification/

---

# 11. Noorematele sobiv laiendus

## Lisa GET /workshops endpoint

1. Tagasta kõik workshopid
2. Kirjuta integration test
3. Lisa Swagger dokumentatsiooni vastus

---

# 12. Arhitektuuriline refleksioon

Küsimused:

- Kus toimub äriloogika?
- Kas route fail peaks sisaldama loogikat?
- Kas booking loogika võiks olla Service kihis?
- Kuidas see mõjutab testitavust?

---

# 13. Päeva lõpu refleksioon

- Mis oli keerulisem – unit test või integration test?
- Kas Docker muutis arusaamist keskkondadest?
- Kas Swagger aitas mõista API struktuuri?
- Kui palju teste oleks piisav enne deploy'd?

---

# 14. Lisamaterjalid

Docker:
https://docs.docker.com/

Prisma:
https://www.prisma.io/docs

Supertest:
https://github.com/ladjs/supertest

OpenAPI:
https://swagger.io/specification/

Testimise strateegia:
https://martinfowler.com/articles/practical-test-pyramid.html
