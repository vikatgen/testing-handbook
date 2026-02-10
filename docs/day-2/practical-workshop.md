# Päev 2 – Praktiline töötuba (ülesanded)

## Enne alustamist

Veendu, et:

- Oled lugenud läbi [scaffold projekti ülevaate](/day-2/practical-api-testing)
- Docker töötab (`docker compose ps`)
- Node.js >= 18
- Projekt on kloonitud ja `npm install` tehtud
- Migratsioonid on käivitatud mõlema andmebaasi jaoks

```bash
docker compose up -d
npx prisma migrate dev
npm run migrate:test
```

---

Te töötate paarides. Rollivahetus iga ~40 min.

---

# Faas 1: Tutvu scaffold projektiga

Enne testide kirjutamist tuleb süsteem tundma õppida.

## 1.1 Käivita rakendus

```bash
npm run dev
```

Ava brauseris: `http://localhost:3000/docs`

See on Swagger UI. Siin näed kõiki API endpointe.

## 1.2 Tee käsitsi API päringuid

Kasuta Swagger UI'd või cURL/Postman'i, et testida endpointe käsitsi:

**Loo kasutaja:**
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Ada", "email": "ada@test.com"}'
```

**Loo workshop:**
```bash
curl -X POST http://localhost:3000/workshops \
  -H "Content-Type: application/json" \
  -d '{"title": "Node.js Testing", "capacity": 3}'
```

**Tee broneering:**
```bash
curl -X POST http://localhost:3000/bookings \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "workshopId": 1}'
```

**Kontrolli tervist:**
```bash
curl http://localhost:3000/health
```

## 1.3 Uuri koodi

Ava järgmised failid ja vaata, kuidas päring liigub läbi kihtide:

1. `src/routes/bookingRoutes.js` — milline URL millist controllerit kutsub?
2. `src/controllers/bookingController.js` — kuidas controller service'it kasutab?
3. `src/services/bookingService.js` — milline äriloogika siin on?
4. `src/repositories/bookingRepository.js` — milliseid Prisma päringuid tehakse?

::: tip Küsimus
Kas sa näed, kuidas see vastab eilsele teooriale (sektsioon 13 — kihiline arhitektuur)? Controller ei tea andmebaasist midagi, service ei tea Expressist midagi.
:::

## 1.4 Käivita olemasolevad testid

```bash
npm test
```

Vaata, mis testid juba olemas on. Kas kõik lähevad läbi?

---

# Faas 2: Unit testid — service kihi testimine

Unit testides testime äriloogikat **ilma andmebaasita**, kasutades mock repository objekte. See on täpselt see, mida eile teoorias õppisime (sektsioon 11 — mockimine).

## 2.1 Baastase: BookingService testid

Loo fail `tests/unit/bookingService.test.js`:

```js
const BookingService = require("../../src/services/bookingService");

describe("BookingService", () => {
  let mockBookingRepo;
  let mockWorkshopRepo;
  let bookingService;

  beforeEach(() => {
    // Loome mock repository objektid
    mockBookingRepo = {
      countBookings: jest.fn(),
      createBooking: jest.fn(),
      findByUserAndWorkshop: jest.fn()
    };

    mockWorkshopRepo = {
      findById: jest.fn()
    };

    // Anname mock-id service'ile (dependency injection!)
    bookingService = new BookingService(mockBookingRepo, mockWorkshopRepo);
  });

  test("loob broneeringu kui kohti on", async () => {
    // Arrange — seadistame mockide tagastusväärtused
    mockWorkshopRepo.findById.mockResolvedValue({
      id: 1,
      title: "Testing",
      capacity: 10
    });
    mockBookingRepo.countBookings.mockResolvedValue(3);
    mockBookingRepo.findByUserAndWorkshop.mockResolvedValue(null);
    mockBookingRepo.createBooking.mockResolvedValue({
      id: 1,
      userId: 1,
      workshopId: 1
    });

    // Act — kutsume testitavat meetodit
    const result = await bookingService.createBooking(1, 1);

    // Assert — kontrollime tulemust
    expect(result).toEqual({ id: 1, userId: 1, workshopId: 1 });
    expect(mockBookingRepo.createBooking).toHaveBeenCalled();
  });
});
```

::: tip Arrange-Act-Assert
See on levinud testide muster:
- **Arrange** — seadista andmed ja mockid
- **Act** — kutsu testitavat funktsiooni
- **Assert** — kontrolli tulemust
:::

**Sinu ülesanne:** lisa samasse faili testid järgmiste stsenaariumide jaoks:

1. Workshop on täis → peaks viskama vea
2. Kasutaja on juba broneerinud → peaks viskama vea
3. Workshop ei eksisteeri → peaks viskama vea

Näpunäide — veajuhtumi test:

```js
test("viskab vea kui workshop on täis", async () => {
  mockWorkshopRepo.findById.mockResolvedValue({
    id: 1,
    title: "Testing",
    capacity: 5
  });
  mockBookingRepo.countBookings.mockResolvedValue(5);

  await expect(
    bookingService.createBooking(1, 1)
  ).rejects.toThrow("Workshop is full");
});
```

**Käivita testid:**

```bash
npm test -- tests/unit/bookingService.test.js
```

---

## 2.2 Kesktase: UserService ja WorkshopService testid

Kirjuta unit testid ka teiste service'ite jaoks:

**UserService** (`tests/unit/userService.test.js`):
- Kasutaja loomine õnnestub
- Duplikaat-email viskab vea

**WorkshopService** (`tests/unit/workshopService.test.js`):
- Workshop loomine õnnestub
- Capacity peab olema positiivne arv

Kasuta sama mustrit: loo mock repository `beforeEach`'is, testi äriloogikat.

---

## 2.3 Edasijõudnud: kontrolli mock-meetodi väljakutseid

Lisaks tulemuse kontrollile, kontrolli et mock meetodeid kutsuti **õigete argumentidega**:

```js
test("kutsub createBooking õigete andmetega", async () => {
  // ... seadistus ...

  await bookingService.createBooking(1, 1);

  expect(mockBookingRepo.createBooking).toHaveBeenCalledWith({
    userId: 1,
    workshopId: 1
  });
});
```

Ja kontrolli, et teatud meetodeid **ei kutsutud**:

```js
test("ei kutsu createBooking kui workshop on täis", async () => {
  // ... seadistus kus workshop on täis ...

  await expect(
    bookingService.createBooking(1, 1)
  ).rejects.toThrow();

  expect(mockBookingRepo.createBooking).not.toHaveBeenCalled();
});
```

---

# Faas 3: Integration testid — API testimine

Integration testides testime **kogu süsteemi** — teeme päris HTTP päringu, mis läbib kõik kihid kuni andmebaasini.

## 3.1 Baastase: GET /health

Loo fail `tests/integration/health.test.js`:

```js
const request = require("supertest");
const app = require("../../src/app");

describe("GET /health", () => {
  test("tagastab status 200", async () => {
    const res = await request(app).get("/health");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
  });
});
```

**Käivita:**

```bash
npm test -- tests/integration/health.test.js
```

---

## 3.2 Baastase: POST /users

Loo fail `tests/integration/users.test.js`:

```js
const request = require("supertest");
const app = require("../../src/app");
const { resetDb } = require("../helpers/resetDb");

describe("POST /users", () => {
  beforeEach(async () => {
    await resetDb();
  });

  test("loob uue kasutaja", async () => {
    const res = await request(app)
      .post("/users")
      .send({ name: "Ada", email: "ada@test.com" });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.name).toBe("Ada");
    expect(res.body.email).toBe("ada@test.com");
  });

  test("tagastab 400 kui nimi puudub", async () => {
    const res = await request(app)
      .post("/users")
      .send({ email: "ada@test.com" });

    expect(res.statusCode).toBe(400);
  });
});
```

::: warning resetDb() on oluline!
`beforeEach` puhastab andmebaasi enne iga testi. Ilma selleta võivad testid üksteist mõjutada (nt duplikaat-email viga).
:::

**Sinu ülesanne:** lisa testid:
- Duplikaat-email → peaks tagastama 400 või 409
- Puuduv email → peaks tagastama 400

---

## 3.3 Kesktase: POST /workshops

Loo fail `tests/integration/workshops.test.js` ja testi:

- Workshop loomine (happy path) → 201
- Puuduv title → 400
- Capacity 0 või negatiivne → 400

---

## 3.4 Kesktase: POST /bookings

Loo fail `tests/integration/bookings.test.js` ja testi:

**Happy path:**
```js
test("loob broneeringu", async () => {
  // Loo esmalt kasutaja ja workshop
  const user = await request(app)
    .post("/users")
    .send({ name: "Ada", email: "ada@test.com" });

  const workshop = await request(app)
    .post("/workshops")
    .send({ title: "Testing", capacity: 10 });

  // Nüüd tee broneering
  const res = await request(app)
    .post("/bookings")
    .send({
      userId: user.body.id,
      workshopId: workshop.body.id
    });

  expect(res.statusCode).toBe(201);
});
```

**Sinu ülesanne — lisa testid:**
1. Workshop on täis → 409
2. Topeltbroneering (sama kasutaja, sama workshop) → 409
3. Olematu workshop → 404
4. Olematu kasutaja → 404

::: tip Kuidas testida "workshop on täis"?
Loo workshop capacity'ga 1, tee üks broneering (peaks õnnestuma), seejärel tee teine broneering (peaks ebaõnnestuma 409-ga).
:::

---

## 3.5 Edasijõudnud: error vastuse struktuur

Kontrolli, et veateated tagastavad ühtlase struktuuri:

```js
test("error vastus sisaldab error välja", async () => {
  const res = await request(app)
    .post("/bookings")
    .send({ userId: 999, workshopId: 999 });

  expect(res.statusCode).toBeGreaterThanOrEqual(400);
  expect(res.body).toHaveProperty("error");
});
```

---

## 3.6 Edasijõudnud: concurrency test

Mis juhtub, kui kaks päringut tulevad samaaegselt?

```js
test("ainult üks broneering õnnestub kui 1 koht", async () => {
  // Loo kasutajad ja workshop (capacity: 1)
  // ...

  // Tee kaks päringut paralleelselt
  const [res1, res2] = await Promise.all([
    request(app).post("/bookings").send({ userId: user1.body.id, workshopId: ws.body.id }),
    request(app).post("/bookings").send({ userId: user2.body.id, workshopId: ws.body.id })
  ]);

  // Üks peaks õnnestuma, teine ebaõnnestuma
  const statuses = [res1.statusCode, res2.statusCode].sort();
  expect(statuses).toEqual([201, 409]);
});
```

**Arutelu:**
- Kas see test läheb alati läbi?
- Mis on race condition?
- Kuidas Prisma `$transaction` aitab?

---

# 4. Noorematele sobiv laiendus

## Lisa GET /workshops endpoint

Kui booking testid on valmis, proovi:

1. Lisa `GET /workshops` endpoint, mis tagastab kõik workshopid
2. Kirjuta integration test selle jaoks
3. Lisa endpoint Swagger dokumentatsiooni

---

# 5. Hindamiskriteeriumid

### Baastase (kõik peavad tegema):
- GET /health test
- POST /users happy path + veajuhtum
- POST /bookings happy path
- `beforeEach` puhastab andmebaasi

### Kesktase:
- POST /workshops testid
- POST /bookings veajuhtumid (täis, topelt, olematu)
- Unit testid service kihile

### Edasijõudnud:
- Mock-meetodite väljakutsete kontroll
- Error vastuse struktuuri kontroll
- Concurrency test
- GET /workshops lisamine

---

# 6. Päeva lõpu refleksioon

Arutage paaris:

- Mis vahe on unit testil ja integration testil **praktikas** (mitte ainult teoorias)?
- Kas unit testid (mock repository) andsid kindlust, et äriloogika töötab?
- Kas integration testid (Supertest + DB) leidsid vigu, mida unit testid ei leidnud?
- Kumb tüüp oli keerulisem kirjutada? Kumb andis rohkem kindlust?
- Kuidas Docker ja test-andmebaas muutsid testimist lihtsamaks?
- Kui palju teste oleks piisav enne deploy'd?
