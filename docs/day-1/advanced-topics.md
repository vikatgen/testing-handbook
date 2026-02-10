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

# 18. Praktiline workshop – Jest ja puhtad funktsioonid

## Eesmärk

Nüüd rakendame teooria praktikas! Selles workshopis:

- Seadistad Jest testrunner'i nullist
- Kirjutad puhtaid funktsioone (pure functions)
- Rakendad TDD tsüklit: Red → Green → Refactor
- Koged, kuidas testid juhivad koodi kirjutamist

::: tip Miks puhtad funktsioonid?
Puhtad funktsioonid on kõige lihtsam viis testimist õppida — neil pole sõltuvusi, nad tagastavad alati sama tulemuse samade sisenditega. Express ja andmebaas tulevad Päeval 2.
:::

---

## 18.1 Projekti seadistamine

### Samm 1: Loo uus projekt

```bash
mkdir jest-workshop
cd jest-workshop
npm init -y
```

### Samm 2: Paigalda Jest

```bash
npm install --save-dev jest
```

### Samm 3: Seadista package.json

Ava `package.json` ja muuda `scripts` osa:

```json
{
  "scripts": {
    "test": "jest"
  }
}
```

### Samm 4: Loo failide struktuur

```
jest-workshop/
  src/
    booking.js
    validation.js
    math.js
  tests/
    booking.test.js
    validation.test.js
    math.test.js
  package.json
```

Loo kaustad:

```bash
mkdir src tests
```

### Samm 5: Kontrolli, et Jest töötab

Loo fail `tests/setup.test.js`:

```js
test("Jest töötab", () => {
  expect(1 + 1).toBe(2);
});
```

Käivita:

```bash
npm test
```

Peaksid nägema rohelist testi. Kui jah — kõik on valmis!

Kustuta `tests/setup.test.js` enne järgmise sammuga jätkamist.

---

## 18.2 Harjutus 1: canBook() – TDD tsükkel

Siin harjutame TDD'd samm-sammult.

### Red: kirjuta ebaõnnestuv test

Loo fail `tests/booking.test.js`:

```js
const { canBook } = require("../src/booking");

describe("canBook", () => {
  test("tagastab true kui kohti on saadaval", () => {
    expect(canBook(10, 5)).toBe(true);
  });

  test("tagastab false kui workshop on täis", () => {
    expect(canBook(10, 10)).toBe(false);
  });

  test("tagastab false kui kohti on üle", () => {
    expect(canBook(10, 15)).toBe(false);
  });
});
```

Käivita `npm test` — testid **peavad ebaõnnestuma** (Red).

### Green: kirjuta minimaalne kood

Loo fail `src/booking.js`:

```js
function canBook(capacity, currentBookings) {
  return currentBookings < capacity;
}

module.exports = { canBook };
```

Käivita `npm test` — testid **peavad läbi minema** (Green).

### Refactor: kas koodi saab paremaks teha?

Siin on kood juba lihtne, seega refaktoreerimine pole vajalik. Aga TDD tsükkel näeb ette, et selles faasis vaatad koodi üle.

---

## 18.3 Harjutus 2: validateEmail()

### Red: kirjuta testid kõigepealt

Loo fail `tests/validation.test.js`:

```js
const { validateEmail } = require("../src/validation");

describe("validateEmail", () => {
  test("kehtiv email tagastab true", () => {
    expect(validateEmail("test@example.com")).toBe(true);
  });

  test("email ilma @-märgita tagastab false", () => {
    expect(validateEmail("testexample.com")).toBe(false);
  });

  test("tühi string tagastab false", () => {
    expect(validateEmail("")).toBe(false);
  });

  test("null tagastab false", () => {
    expect(validateEmail(null)).toBe(false);
  });
});
```

Käivita `npm test` — Red.

### Green: implementeeri

Loo fail `src/validation.js`:

```js
function validateEmail(email) {
  if (!email) return false;
  return email.includes("@");
}

module.exports = { validateEmail };
```

Käivita `npm test` — Green.

### Refactor: lisa edge case'id

Nüüd mõtle: kas on veel olukordi, mida peaks testima?

Lisa testid ise:
- Mis juhtub emailiga `"@"`?
- Mis juhtub emailiga `"test@"`?

Vajadusel paranda implementatsiooni.

---

## 18.4 Harjutus 3: divide() – veakäsitlus

### Red: testid

Loo fail `tests/math.test.js`:

```js
const { divide } = require("../src/math");

describe("divide", () => {
  test("jagab kaks arvu õigesti", () => {
    expect(divide(10, 2)).toBe(5);
  });

  test("tagastab ujukomaarvu", () => {
    expect(divide(7, 2)).toBe(3.5);
  });

  test("viskab vea nulliga jagamisel", () => {
    expect(() => divide(10, 0)).toThrow("Cannot divide by zero");
  });
});
```

### Green: implementeeri

Loo fail `src/math.js`:

```js
function divide(a, b) {
  if (b === 0) {
    throw new Error("Cannot divide by zero");
  }
  return a / b;
}

module.exports = { divide };
```

::: tip Uus pattern: expect(() => ...).toThrow()
Kui tahad testida, et funktsioon viskab vea, pead selle mähkima `() =>` sisse. Muidu Jest ei suuda viga püüda.
:::

---

## 18.5 Iseseisvad ülesanded

Nüüd on sinu kord! Rakenda TDD tsüklit ise — **kirjuta test enne koodi**.

### Ülesanne A: Lisa canBook() reeglid

Lisa `src/booking.js` faili uus funktsioon ja testi seda:

```js
// Funktsioon: canUserBook(capacity, currentBookings, userAlreadyBooked)
// Reeglid:
// - Kui kohti pole → tagasta { allowed: false, reason: "Workshop is full" }
// - Kui kasutaja on juba broneerinud → tagasta { allowed: false, reason: "Already booked" }
// - Muidu → tagasta { allowed: true }
```

**TDD:** kirjuta kõigepealt testid `tests/booking.test.js` faili, siis implementeeri.

### Ülesanne B: calculatePrice()

Kirjuta funktsioon ja testid:

```js
// Funktsioon: calculatePrice(basePrice, quantity, discountPercent)
// Reeglid:
// - Tavaline hind: basePrice * quantity
// - Allahindlus: lahuta discountPercent protsentides
// - Kui quantity < 1 → throw Error
// - Kui discountPercent > 100 või < 0 → throw Error
//
// Näide: calculatePrice(100, 3, 10) → 270 (300 - 10%)
```

### Ülesanne C (edasijõudnutele): parseBookingInput()

```js
// Funktsioon: parseBookingInput(input)
// Sisend on objekt: { workshopId, userId, capacity }
// Reeglid:
// - workshopId peab olema positiivne täisarv
// - userId peab olema positiivne täisarv
// - capacity peab olema > 0
// - Kui validatsioon ebaõnnestub → throw Error kirjeldava sõnumiga
// - Kui kõik on korras → tagasta { workshopId, userId, capacity }
//
// Testi edge case'id: negatiivsed arvud, stringid, undefined, null
```

---

## 18.6 Refleksioon

Arutage paaris:

- Kas testide kirjutamine **enne** koodi muutis sinu mõtlemist?
- Kas TDD tsükkel (Red → Green → Refactor) tundus loomulik?
- Milliseid vigu oleksid teinud ilma testideta?
- Kuidas aitavad puhtad funktsioonid testitavusele kaasa?

::: tip Mida homme teeme?
Päeval 2 rakendame neid samu põhimõtteid päris Express API projektis — testime service kihti mockidega ja API endpointe Supertestiga. Seal tuleb kasuks ka kihilise arhitektuuri teooria, mida täna lugesid (sektsioonid 13–17).
:::


