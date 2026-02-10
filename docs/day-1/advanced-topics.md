# 11. Test Double'id ja mockimine

## 11.1 Mis on Test Double?

Test Double on objekt, mis asendab päris sõltuvuse (dependency) testimise käigus.

Miks seda vaja on?

Sest unit test peaks olema:

- kiire
- isoleeritud
- deterministlik

Kui meie funktsioon sõltub andmebaasist, HTTP päringust või välisest teenusest, siis test ei ole enam unit test.

Test Double tüübid (Gerard Meszaros):

- Dummy – objekt, mida ei kasutata, kuid mis on vajalik signatuuri täitmiseks
- Stub – tagastab fikseeritud väärtuse
- Fake – lihtsustatud implementatsioon (nt in-memory andmebaas)
- Spy – salvestab infot selle kohta, kuidas teda kutsuti
- Mock – kontrollib, et teda kutsuti kindlal viisil

### Allikas
- Gerard Meszaros – xUnit Test Patterns
- Martin Fowler – Test Double  
  https://martinfowler.com/bliki/TestDouble.html

---

## 11.2 Miks me ei taha päris andmebaasi unit testis?

Näide halvast unit testist:

```js
const user = await db.user.create({ ... });
expect(user.id).toBeDefined();
```

Probleemid:

- Sõltub andmebaasi ühendusest
- On aeglane
- Võib ebaõnnestuda keskkonna tõttu
- Ei ole deterministlik

Unit test peaks testima ainult äriloogikat, mitte infrastruktuuri.

---

## 11.3 Mockimine Node.js kontekstis (Jest)

`jest.fn()` loob mock-funktsiooni, millele saab ette anda soovitud tagastusväärtuse:

```js
const mockCountBookings = jest.fn();

// Ütleme mockile: kui sind kutsutakse, tagasta 5
mockCountBookings.mockReturnValue(5);

// Nüüd saame kontrollida loogikat ilma andmebaasita
const count = mockCountBookings();  // tagastab 5
```

Praktiline näide — loome mock repository objekti:

```js
test("ei luba broneerida kui kohad on täis", () => {
  const mockRepository = {
    countBookings: jest.fn().mockReturnValue(5),
    createBooking: jest.fn()
  };

  // Anname mock repository service'ile (dependency injection)
  const service = new BookingService(mockRepository);

  expect(() => service.createBooking(1, 5)).toThrow("Workshop is full");
  expect(mockRepository.createBooking).not.toHaveBeenCalled();
});
```

Siin ei kasutata päris andmebaasi.
Me kontrollime ainult äriloogikat, andes service'ile "võlts" repository.

### Allikas
- Jest Mock Functions  
  https://jestjs.io/docs/mock-functions

---

# 12. Isolatsioon (Isolation)

Isolation tähendab, et testitav üksus (unit) ei sõltu välisest seisundist.

Isolatsiooni põhimõtted:

- Ära kasuta globaalset seisundit
- Ära kasuta päris andmebaasi unit testis
- Ära kasuta võrguühendust unit testis
- Ära sõltu ajast või juhuslikkusest

Halb näide:

```js
function generateId() {
  return Math.random();
}
```

Seda on raske testida.

Parem lahendus:

```js
function generateId(randomFn) {
  return randomFn();
}
```

Testis saad anda kontrollitud funktsiooni.

See on dependency injection.

---

# 13. Testitav arhitektuur (Testable Design)

## 13.0 Probleem: kõik ühes route'is

Tõenäoliselt oled seni kirjutanud Express koodi umbes nii:

```js
// routes/bookings.js
router.post("/bookings", async (req, res) => {
  const { workshopId, userId } = req.body;

  // Kontrollime, kas workshop eksisteerib
  const workshop = await prisma.workshop.findUnique({
    where: { id: workshopId }
  });
  if (!workshop) {
    return res.status(404).json({ error: "Workshop not found" });
  }

  // Kontrollime, kas kohti on
  const count = await prisma.booking.count({
    where: { workshopId }
  });
  if (count >= workshop.capacity) {
    return res.status(409).json({ error: "Workshop is full" });
  }

  // Loome broneeringu
  const booking = await prisma.booking.create({
    data: { workshopId, userId }
  });

  res.status(201).json(booking);
});
```

See töötab. Aga kuidas seda testida?

**Probleem:** äriloogika (capacity kontroll, topeltbroneeringu kontroll) on segunenud Expressi route'iga ja andmebaasi päringutega. Et testida loogikat, peaksid käivitama terve Express serveri ja päris andmebaasi.

---

## 13.1 Lahendus: kihiline arhitektuur

Mõte on lihtne: **eralda vastutused erinevatesse kihtidesse.**

```
Route -> Controller -> Service -> Repository -> Database
```

Iga kiht teeb ühte asja:

| Kiht | Vastutus | Näide |
|------|----------|-------|
| **Route** | URL-i ja HTTP meetodi sidumine | `router.post("/bookings", ...)` |
| **Controller** | Req/res käsitlemine, validatsioon | Loeb body't, saadab vastuse |
| **Service** | Äriloogika | "Kas workshop on täis?" |
| **Repository** | Andmebaasi päringud | `prisma.booking.count(...)` |

---

## 13.2 Samm-sammult refaktoreerimine

### Samm 1: Eralda andmebaasi päringud → Repository

```js
// repositories/bookingRepository.js
class BookingRepository {
  async countBookings(workshopId) {
    return prisma.booking.count({ where: { workshopId } });
  }

  async createBooking(data) {
    return prisma.booking.create({ data });
  }
}
```

### Samm 2: Eralda äriloogika → Service

```js
// services/bookingService.js
class BookingService {
  constructor(bookingRepository) {
    this.bookingRepository = bookingRepository;
  }

  async createBooking(workshopId, capacity) {
    const currentBookings =
      await this.bookingRepository.countBookings(workshopId);

    if (currentBookings >= capacity) {
      throw new Error("Workshop is full");
    }

    return this.bookingRepository.createBooking({ workshopId });
  }
}
```

### Samm 3: Route jääb "õhukeseks"

```js
// routes/bookings.js
router.post("/bookings", async (req, res) => {
  try {
    const result = await bookingService.createBooking(
      req.body.workshopId,
      req.body.capacity
    );
    res.status(201).json(result);
  } catch (err) {
    res.status(409).json({ error: err.message });
  }
});
```

### Mis me saavutasime?

- **Service** ei tea midagi Expressist (pole `req`, `res`)
- **Service** ei tea midagi andmebaasist (kasutab ainult repository liidest)
- **Repository** on vahetatav (päris DB või mock)

See tähendab, et **Service kihti saab testida unit testiga ilma andmebaasita.**

---

## 13.1 Dependency Injection

Dependency Injection tähendab, et sõltuvus antakse funktsioonile väljastpoolt.

Halb:

```js
const db = require("./db");

function createUser(data) {
  return db.user.create(data);
}
```

Hea:

```js
function createUser(data, userRepository) {
  return userRepository.create(data);
}
```

Nüüd saab testis anda mock repository.

See muudab süsteemi testitavaks.

### Allikas
- Martin Fowler – Inversion of Control  
  https://martinfowler.com/bliki/InversionOfControl.html

---

# 14. Millal kasutada mocke ja millal mitte?

Mocke kasutatakse:

- Unit testides
- Kui sõltuvus on aeglane
- Kui sõltuvus on ebastabiilne
- Kui sõltuvus on keeruline

Mocke ei kasutata:

- Integration testides
- Kui tahame testida päris süsteemi koostööd

Liigne mockimine võib muuta testid habrasteks.

---

# 15. Arhitektuuriline mõtlemine

Testimine ei ole ainult kvaliteedikontroll.

Testimine mõjutab disaini.

Kui koodi on raske testida, siis:

- Funktsioon on liiga suur
- Vastutus on segamini
- Sõltuvused on liiga tugevad
- Arhitektuur vajab ümbermõtlemist

Hea testitavus on sageli märk heast arhitektuurist.

---

# 16. Aruteluküsimused (edasijõudnud)

- Kas dependency injection muudab süsteemi keerulisemaks?
- Kas iga sõltuvus tuleks mockida?
- Kui palju mockimist on liiga palju?
- Kas integration test võib asendada unit testi?

---

# 17. Kokkuvõte (edasijõudnud osa)

Testimine ei ole lihtsalt testide kirjutamine.

See on:

- Arhitektuuri disain
- Sõltuvuste juhtimine
- Vastutuste eraldamine
- Süsteemi kvaliteedi strateegia

Professionaalne arendaja mõtleb testitavusele enne implementatsiooni.

# 18. Praktiline workshop – Kihiline arhitektuur ja mockimine

## Eesmärk

Rakendada:

- Dependency Injection
- Service kihi unit testimist
- Repository mockimist
- Isolatsiooni põhimõtteid

---

# 18.1 Arhitektuuri struktuur

Me loome lihtsustatud broneerimissüsteemi.

Struktuur:

```
src/
  controllers/
    bookingController.js
  services/
    bookingService.js
  repositories/
    bookingRepository.js
```

---

# 18.2 Repository (infrastruktuurikiht)

```js
// repositories/bookingRepository.js

class BookingRepository {
  async countBookings(workshopId) {
    // siin oleks päris andmebaasi päring
    throw new Error("Not implemented");
  }

  async createBooking(data) {
    throw new Error("Not implemented");
  }
}

module.exports = BookingRepository;
```

---

# 18.3 Service (äriloogika kiht)

```js
// services/bookingService.js

class BookingService {
  constructor(bookingRepository) {
    this.bookingRepository = bookingRepository;
  }

  async createBooking(workshopId, capacity) {
    const currentBookings =
      await this.bookingRepository.countBookings(workshopId);

    if (currentBookings >= capacity) {
      throw new Error("Workshop is full");
    }

    return this.bookingRepository.createBooking({ workshopId });
  }
}

module.exports = BookingService;
```

Oluline:

Service EI tea midagi andmebaasist.  
Service teab ainult repository liidest.

See teeb selle testitavaks.

---

# 18.4 Unit test – mock repository

```js
// tests/bookingService.test.js

const BookingService = require("../services/bookingService");

describe("BookingService", () => {
  let mockRepository;
  let bookingService;

  beforeEach(() => {
    mockRepository = {
      countBookings: jest.fn(),
      createBooking: jest.fn()
    };

    bookingService = new BookingService(mockRepository);
  });

  test("viskab vea kui workshop on täis", async () => {
    mockRepository.countBookings.mockResolvedValue(5);

    await expect(
      bookingService.createBooking(1, 5)
    ).rejects.toThrow("Workshop is full");

    expect(mockRepository.createBooking).not.toHaveBeenCalled();
  });

  test("loob broneeringu kui kohti on saadaval", async () => {
    mockRepository.countBookings.mockResolvedValue(2);
    mockRepository.createBooking.mockResolvedValue({
      id: 1,
      workshopId: 1
    });

    const result = await bookingService.createBooking(1, 5);

    expect(result).toEqual({
      id: 1,
      workshopId: 1
    });

    expect(mockRepository.createBooking).toHaveBeenCalledWith({
      workshopId: 1
    });
  });
});
```

---

# 18.5 Mida see test tegelikult teeb?

- Me ei kasuta päris andmebaasi
- Me kontrollime ainult äriloogikat
- Me valideerime, et repository meetodeid kutsutakse õigesti
- Me testime käitumist, mitte implementatsiooni detaile

See on päris unit test.

---

# 18.6 Aruteluküsimused

1. Mis juhtuks, kui me kasutaks päris andmebaasi?
2. Kas see test kontrollib liiga palju?
3. Kas mockimine muudab testid hapraks?
4. Kus peaks toimuma valideerimine – controlleris või service’is?

---

# 18.7 Edasijõudnutele – Integration test (mõtteharjutus)

Kuidas muutuks test, kui me tahaks testida:

- Express route
- Päris andmebaasi
- Repository implementatsiooni

Kas me kasutaks mocke?

Ei.

Siis muutub test integration testiks.

---

# 18.8 Refleksioon

See harjutus näitab:

- Testitav arhitektuur nõuab teadlikku disaini
- Dependency Injection muudab süsteemi paindlikuks
- Unit test ei tohiks sõltuda infrastruktuurist
- Mockimine on tööriist, mitte eesmärk

Kui koodi on raske testida,
siis on arhitektuur tõenäoliselt vale.

# 19. Mini Challenge – Test Driven Booking Logic

## Eesmärk

Rakendada:

- TDD tsüklit (Red → Green → Refactor)
- Dependency Injection'i
- Mock repository kasutamist
- Äriloogika testimist isolatsioonis

Töö toimub paarides:
- 1 vanem + 1 noorem
- Rollivahetus iga ~30–40 minuti järel

---

# 19.1 Ülesanne – Laienda BookingService loogikat

::: tip Märkus
Meie `createBooking` meetod on kasvanud algsest lihtsast `canBook(capacity, currentBookings)` funktsioonist täisväärtuslikuks service meetodiks, mis saab nüüd ka `userId` parameetri. See on loomulik — äriloogika kasvab koos nõuetega.
:::

Antud on BookingService, mis kontrollib ainult capacity't.

Teie ülesanne on lisada järgmised ärireeglid:

1. Üks kasutaja ei tohi sama workshop'i kaks korda broneerida
2. Workshop peab eksisteerima
3. Capacity peab olema positiivne arv

---

# 19.2 Repository liides (mockimiseks)

Lisage mock repository'sse järgmised meetodid:

- countBookings(workshopId)
- createBooking(data)
- userAlreadyBooked(userId, workshopId)
- workshopExists(workshopId)

---

# 19.3 TDD reegel

Ärge kirjutage uut äriloogikat enne, kui:

- test on kirjutatud
- test ebaõnnestub

---

# 19.4 Baastase (kõik paarid)

Kirjutage unit test, mis kontrollib:

- Kui workshop ei eksisteeri → visatakse Error("Workshop not found")
- Kui kasutaja on juba broneerinud → visatakse Error("Already booked")

Näide testist:

```js
test("ei luba topeltbroneeringut", async () => {
  mockRepository.workshopExists.mockResolvedValue(true);
  mockRepository.userAlreadyBooked.mockResolvedValue(true);

  await expect(
    bookingService.createBooking(1, 10, 5)
  ).rejects.toThrow("Already booked");
});
```

---

# 19.5 Edasijõudnud (vanemad)

Lisage:

- Custom error class (nt BookingError)
- Erinevad error tüübid (NOT_FOUND, FULL, DUPLICATE)
- Testige, et õige error type tagastatakse

Näide:

```js
await expect(
  bookingService.createBooking(1, 10, 5)
).rejects.toMatchObject({
  type: "DUPLICATE"
});
```

---

# 19.6 Stretch Goal (ainult kui aeg lubab)

Refaktoreerige BookingService nii, et:

- Capacity kontroll ei sõltu parameetrist
- Workshop andmed tulevad repository kaudu
- Service ei tea midagi controllerist ega Expressist

---

# 19.7 Hindamiskriteeriumid

Hea lahendus:

- Kasutab dependency injection'it
- Ei kasuta päris andmebaasi
- Omab vähemalt 5 selget unit testi
- Testid on loetavad ja kirjeldavad käitumist

---

# 19.8 Refleksioon

Arutage paaris:

- Kas testide kirjutamine enne koodi muutis mõtlemist?
- Kas mockimine tundus loomulik või kunstlik?
- Kus tundus arhitektuur keerulisem kui vaja?


