# Päev 2 – Scaffold projekti ülevaade

## Päeva eesmärk

Täna töötame päris Express API projektiga. Enne ülesannete juurde asumist tutvume põhjalikult projekti struktuuriga.

Päev 2 koosneb kahest osast:

1. **See leht** — scaffold projekti selgitus (loe läbi enne ülesannete alustamist)
2. **Ülesanded** — samm-sammult juhendatud harjutused

---

# 1. Projekti kloonimine ja käivitamine

Õpetaja annab teile scaffold projekti lingi. Kloonige see:

```bash
git clone https://github.com/vikatgen/test-handbook-nodejs-express-application.git
cd test-handbook-nodejs-express-application
npm install
```

Kontrollige, et kõik on paigas:

```bash
node --version   # peaks olema >= 18
docker --version # peaks olema paigaldatud
```

---

# 2. Projekti struktuur

```
workshop-booking-api/
├── src/
│   ├── app.js              ← Express rakenduse seadistus
│   ├── server.js           ← Serveri käivitamine (port)
│   ├── routes/
│   │   ├── healthRoutes.js
│   │   ├── userRoutes.js
│   │   ├── workshopRoutes.js
│   │   └── bookingRoutes.js
│   ├── controllers/
│   │   ├── userController.js
│   │   ├── workshopController.js
│   │   └── bookingController.js
│   ├── services/
│   │   ├── userService.js
│   │   ├── workshopService.js
│   │   └── bookingService.js
│   └── repositories/
│       ├── userRepository.js
│       ├── workshopRepository.js
│       └── bookingRepository.js
├── prisma/
│   └── schema.prisma       ← Andmebaasi skeem
├── tests/
│   └── helpers/
│       └── resetDb.js      ← Test-andmebaasi puhastamine
├── docker-compose.yml       ← Postgres konteinerid
├── .env                     ← Arenduskeskkonna seaded
├── .env.test                ← Testkeskkonna seaded
└── package.json
```

::: tip Miks nii palju faile?
Eilne teooria (sektsioon 13) selgitas, miks äriloogika, andmebaas ja HTTP käsitlemine peavad eraldi olema. See scaffold rakendab täpselt seda kihilist arhitektuuri.
:::

---

# 3. Kihiline arhitektuur praktikas

Eile lugesime teoorias kihilisest arhitektuurist. Siin on see päriselt rakendatud:

```
Route → Controller → Service → Repository → Database
```

| Kiht | Fail (näide) | Mida teeb? |
|------|-------------|------------|
| **Route** | `routes/bookingRoutes.js` | Seob URL-i ja HTTP meetodi controlleriga |
| **Controller** | `controllers/bookingController.js` | Loeb `req.body`, kutsub service'it, saadab `res` vastuse |
| **Service** | `services/bookingService.js` | Äriloogika: "Kas workshop on täis? Kas kasutaja on juba broneerinud?" |
| **Repository** | `repositories/bookingRepository.js` | Andmebaasi päringud Prisma kaudu |

### Miks see on testimiseks oluline?

- **Service kihti** saab testida unit testiga — anname talle mock repository
- **Kogu API'd** saab testida integration testiga — teeme päris HTTP päringu

See on täpselt see, mida eile teoorias õppisime (dependency injection, mockimine).

---

# 4. Docker ja Postgres

## Miks Docker?

Docker võimaldab käivitada Postgresi andmebaasi ilma, et peaksid seda oma arvutisse otse paigaldama. Kõik on konteineris.

## Kaks andmebaasi

Projektis on **kaks** Postgresi andmebaasi:

| Andmebaas | Kasutus | Env fail |
|-----------|---------|----------|
| `app_dev` | Arendus — siin on "päris" andmed | `.env` |
| `app_test` | Testimine — puhastatakse enne iga testi | `.env.test` |

**Miks eraldi test-andmebaas?**

- Testid peavad olema korduvkäivitatavad — iga kord puhas olek
- Testid ei tohi rikkuda arendusandmeid
- Test-andmebaasi saab enne iga testi tühjendada

## Docker Compose käivitamine

```bash
docker compose up -d
```

See käivitab Postgresi konteineri taustal. `-d` tähendab "detached" ehk taustal.

Kontrolli, et konteiner töötab:

```bash
docker compose ps
```

---

# 5. Prisma – andmebaasi ORM

## Mis on Prisma?

Prisma on ORM (Object-Relational Mapping), mis võimaldab andmebaasiga suhelda JavaScripti kaudu ilma SQL-i kirjutamata.

## Schema

`prisma/schema.prisma` defineerib andmebaasi tabelid:

```prisma
model User {
  id       Int       @id @default(autoincrement())
  name     String
  email    String    @unique
  bookings Booking[]
}

model Workshop {
  id       Int       @id @default(autoincrement())
  title    String
  capacity Int
  bookings Booking[]
}

model Booking {
  id         Int      @id @default(autoincrement())
  user       User     @relation(fields: [userId], references: [id])
  userId     Int
  workshop   Workshop @relation(fields: [workshopId], references: [id])
  workshopId Int

  @@unique([userId, workshopId])
}
```

::: tip @@unique([userId, workshopId])
See tähendab, et üks kasutaja saab samasse workshop'i broneerida ainult ühe korra. Andmebaas ise tagab selle reegli.
:::

## Migratsioonid

Migratsioonid loovad/muudavad andmebaasi tabeleid vastavalt schemale.

Arenduse andmebaas:

```bash
npx prisma migrate dev
```

Test-andmebaas:

```bash
npm run migrate:test
```

::: warning Oluline
Käivita migratsioonid **mõlema** andmebaasi jaoks! Muidu testid ei tööta.
:::

---

# 6. Testkeskkonna seadistus

## .env vs .env.test

```
# .env (arendus)
DATABASE_URL="postgresql://user:pass@localhost:5432/app_dev"

# .env.test (testimine)
DATABASE_URL="postgresql://user:pass@localhost:5432/app_test"
```

Kui käivitad `npm test`, kasutab Jest automaatselt `.env.test` faili, mis ühendub test-andmebaasiga.

## resetDb() — andmebaasi puhastamine

Failis `tests/helpers/resetDb.js` on funktsioon, mis puhastab kõik tabelid enne iga testi:

```js
// Näide resetDb kasutamisest testis
beforeEach(async () => {
  await resetDb();
});
```

**Miks see oluline on?**

- Iga test alustab puhtast olekust
- Testid ei sõltu üksteisest ega käivitamise järjekorrast
- See on testide isolatsiooni põhimõte (mida eile teoorias käsitlesime)

---

# 7. API endpointid

Scaffold sisaldab järgmisi endpointe:

| Meetod | URL | Kirjeldus |
|--------|-----|-----------|
| GET | `/health` | Tervisekontroll |
| POST | `/users` | Loo uus kasutaja |
| POST | `/workshops` | Loo uus workshop |
| POST | `/bookings` | Loo uus broneering |

### Ärireeglid (bookings):

- Workshop peab eksisteerima
- Workshop ei tohi olla täis (capacity kontroll)
- Sama kasutaja ei tohi sama workshop'i kaks korda broneerida

---

# 8. Swagger dokumentatsioon

Kui rakendus töötab, on Swagger kättesaadav:

```
http://localhost:3000/docs
```

Swagger näitab:

- Kõiki endpointe
- Sisendi struktuuri (mis andmed saata)
- Vastuse struktuuri (mis tagasi tuleb)
- HTTP staatuskoode

::: tip Swagger kui API leping
Swagger ei ole ainult dokumentatsioon — see on **leping** frontendi ja backendi vahel. Kui API käitumine ei vasta Swaggerile, siis on API vale.
:::

---

# 9. Kuidas testid töötavad selles projektis

### Unit testid (service kiht)

```js
// Anname service'ile mock repository (nagu eile teoorias)
const mockRepository = {
  countBookings: jest.fn(),
  createBooking: jest.fn()
};
const service = new BookingService(mockRepository);
```

- Ei kasuta andmebaasi
- Testivad ainult äriloogikat
- Kiired, isoleeritud

### Integration testid (API tase)

```js
// Teeme päris HTTP päringu Supertestiga
const request = require("supertest");
const app = require("../src/app");

const res = await request(app)
  .post("/users")
  .send({ name: "Ada", email: "ada@test.com" });

expect(res.statusCode).toBe(201);
```

- Kasutavad päris test-andmebaasi
- Testivad kogu süsteemi koostööd (route → controller → service → repository → DB)
- Aeglasemad, aga annavad suurema kindluse

---

# 10. Kokkuvõte — enne ülesannete juurde minekut

Veendu, et mõistad:

- **Kihiline arhitektuur** — miks on route, controller, service ja repository eraldi
- **Kaks andmebaasi** — arendus vs test, miks eraldi
- **Prisma** — kuidas schema defineerib tabeleid ja kuidas migratsioonid töötavad
- **resetDb()** — miks puhastatakse andmebaas enne iga testi
- **Kaht tüüpi testid** — unit (mock repository) vs integration (Supertest + päris DB)

Nüüd mine edasi [ülesannete juurde](/day-2/practical-workshop)!

---

# 11. Lisamaterjalid

- Docker: https://docs.docker.com/
- PostgreSQL: https://www.postgresql.org/docs/
- Prisma: https://www.prisma.io/docs
- Supertest: https://github.com/ladjs/supertest
- OpenAPI/Swagger: https://swagger.io/specification/
- Testimise strateegia: https://martinfowler.com/articles/practical-test-pyramid.html
