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

- Käivitab päris Express app'i
- Ühendub test DB-ga
- Teeb päris päringuid

Oluline:

- Testid peavad DB puhastama (cleanup)
- Testid ei tohi sõltuda eelmisest testist

---

# 5. Prisma migratsioonid

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

# 6. Swagger – API leping

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

# 7. Integration test – mis see tegelikult tähendab?

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

# 8. Test-andmebaasi puhastamine

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

# 9. Testimisstrateegia arutelu

Küsimused:

- Mida me testime unit tasemel?
- Mida me testime integration tasemel?
- Kas me peaksime siin mockima?
- Kui palju integration teste on piisav?

---

# 10. Lisamaterjalid

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

Testimise strateegia:
https://martinfowler.com/articles/practical-test-pyramid.html
