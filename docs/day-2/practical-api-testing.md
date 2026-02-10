# Päev 2 – API testimine, Docker ja test-andmebaas

## Päeva eesmärk

Täna me:

- Töötame päris Express API-ga
- Kasutame Dockerit Postgresi jaoks
- Seadistame test-andmebaasi
- Kirjutame integration testid Supertestiga
- Mõistame Swaggeri rolli API lepinguna
- Rakendame testimist päris projektis

See päev on 100% praktiline.

---

# 1. Projekti kirjeldus

Meie rakendus: Workshop Booking API

Funktsionaalsus:

- GET /health
- POST /users
- POST /workshops
- POST /bookings

Andmebaas:

- users
- workshops
- bookings

Ärireeglid:

- Workshop peab eksisteerima
- Capacity ei tohi ületada
- Sama kasutaja ei tohi topelt broneerida

---

# 2. Arhitektuur (ettevalmistatud scaffold)

Struktuur:

```
src/
  app.js
  server.js
  routes/
  controllers/
  services/
  repositories/
prisma/
tests/
docker-compose.yml
.env
.env.test
```

Te ei alusta nullist.  
Teie ülesanne on süsteemi laiendada ja testida.

---

# 3. Docker ja Postgres

Me kasutame kahte andmebaasi:

- app_dev (arenduseks)
- app_test (testimiseks)

docker-compose käivitamine:

```bash
docker compose up -d
```

Miks eraldi test-andmebaas?

- Testid ei tohi rikkuda arenduse andmeid
- Testid peavad olema korduvkäivitatavad
- Testkeskkond peab olema kontrollitud

---

# 4. Test-andmebaasi põhimõtted

Integration test:

- Käivitab päris Express app’i
- Ühendub test DB-ga
- Teeb päris päringuid

Oluline:

- Testid peavad DB puhastama (cleanup)
- Testid ei tohi sõltuda eelmisest testist

---

# 5. Swagger – API leping

Swagger (OpenAPI) kirjeldab:

- Endpointid
- Sisendstruktuuri
- Vastuse struktuuri
- HTTP staatuseid

Swagger ei ole ainult dokumentatsioon.

See on:

- API contract
- Kommunikatsioonivahend frontendiga
- Testide aluseks

Kui API käitumine ei vasta Swaggerile, siis API on vale.

---

# 6. Tänased ülesanded

Te töötate paarides.

Rollivahetus iga ~40 min.

---

# 6.1 Baastase (kõik paarid)

1. Kirjutage integration test:
    - GET /health
    - Kontrollige status 200

2. Kirjutage integration test:
    - POST /users (happy path)
    - POST /users (vale sisend → 400)

3. Lisage andmebaasi cleanup beforeEach()

---

# 6.2 Kesktase

1. Kirjutage integration test:
    - POST /workshops
    - capacity peab olema > 0

2. Kirjutage integration test:
    - POST /bookings (happy path)

3. Kirjutage test:
    - POST /bookings kui workshop on täis → 409

---

# 6.3 Edasijõudnud (vanemad)

1. Lisage transaction booking loomisel
2. Kontrollige concurrency edge-case:
    - Kaks broneeringut samaaegselt
3. Testige, et API vastab Swaggeris defineeritud vastusele
4. Lisage test, mis kontrollib error response struktuuri

---

# 7. Testimisstrateegia arutelu

Küsimused:

- Mida me testime unit tasemel?
- Mida me testime integration tasemel?
- Kas me peaksime siin mockima?
- Kui palju integration teste on piisav?

---

# 8. Päeva lõpu refleksioon

- Kas integration test oli keerulisem kui unit test?
- Kas Docker lisas keerukust või selgust?
- Kas Swagger aitas mõista API struktuuri?
- Kui palju testid suurendasid kindlustunnet?

---

# 9. Lisamaterjalid

Docker:
https://docs.docker.com/

PostgreSQL:
https://www.postgresql.org/docs/

OpenAPI:
https://swagger.io/specification/

Supertest:
https://github.com/ladjs/supertest

Prisma:
https://www.prisma.io/docs
