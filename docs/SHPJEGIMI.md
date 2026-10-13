# Si ta kuptosh dhe ta shpjegosh projektin

Ky udhëzues është për të mësuar projektin dhe për ta demonstruar me fjalët e tua. Ndiqi shembujt në kod dhe provoji me llogaritë demo, që të kuptosh çdo hap para intervistës.

## Si ta hapësh tani

Shërbimet Docker janë nisur. Hape `http://localhost:5174` në Google Chrome.

- Email: `alice@demo.test` ose `bob@demo.test`.
- Account password: `DemoAccount!2026`.
- Master password, për Unlock: `DemoMaster!2026`.

Alice ka katër kredenciale sintetike. Bob e ka `Demo App` si Viewer dhe `Team Portal` si Editor përmes koleksionit `Work logins`.

Për extension-in: hape `chrome://extensions`, aktivizo Developer mode, zgjidh Load unpacked dhe folderin `extension/dist` brenda projektit. Pastaj hape popup-in, bëj Sign in dhe Unlock. Testoje në `http://localhost:8083`: kliko ikonën në fushën e username-it ose password-it dhe zgjidh `Demo App`.

Nëse e ke ndalur projektin, hape PowerShell në folderin kryesor, nise Docker Desktop dhe ekzekuto:

```powershell
.\scripts\start.ps1
npm run seed
```

Për ta ndalur: `docker compose down`. Të dhënat mbesin në databazën lokale.

## Fazat e projektit

1. **Kërkesat dhe struktura:** nxjerrim funksionet nga PDF-ja dhe ndajmë backend, frontend, extension dhe kodin e përbashkët.
2. **Login dhe enkriptimi:** account password, master password, derivimi i çelësit dhe private key e enkriptuar. Gjatë regjistrimit forma kërkon edhe konfirmimin e të dy password-eve; këto fusha kontrollohen vetëm në frontend dhe nuk dërgohen në API.
3. **Vault personal:** krijim, lexim, ndryshim, fshirje, kërkim, kategori dhe import/eksport.
4. **Ndarja dhe ekipet:** Viewer/Editor/Admin/Owner, grant-et, koleksionet, rename/remove me mbrojtje kur ka credentials dhe pamja e credentials brenda një collection.
5. **Chrome extension:** login/unlock, ikonat, auto-fill, Save/Update, kopjim dhe auto-lock.
6. **Testimi dhe demonstrimi:** testet Java, testet e klientit, API me PostgreSQL dhe rrjedhat në Google Chrome.

Te share dhe te teams nuk i ngarkojmë të gjithë përdoruesit në frontend. Kur shkruan së paku dy karaktere, backend-i kërkon deri në dhjetë email-e përputhëse. Ti zgjedh email-in nga sugjerimet dhe pastaj zgjedh rolin. Kjo është më praktike për përdoruesin dhe ekspozon më pak të dhëna se një listë e plotë.

Këto faza janë implementuar në projektin që ke tani. Tabela `REQUIREMENTS.md` e lidh secilën kërkesë me kodin dhe mënyrën e verifikimit.

## Përshkrimi që mund ta japësh në fillim

“Kam ndërtuar një password manager me Spring Boot, PostgreSQL, React dhe Chrome extension. Përdoruesi mund të ruajë kredenciale, t'i kërkojë, t'i ndajë me role dhe t'i plotësojë në një formular login-i. Enkriptimi bëhet në klient. Backend-i ruan ciphertext dhe kontrollon kush ka leje të lexojë, ndryshojë ose ndajë një kredencial.”

## Pse folderët janë të ndarë

`Controller` pranon kërkesën HTTP dhe thërret `Service`. `Service` zbaton rregullat, kontrollon rolin dhe hap një transaksion. `Repository` lexon ose ruan në databazë. `Entity` përfaqëson tabelën. `DTO` përfaqëson të dhënat që pranojmë ose kthejmë përmes API-së.

Shembull: `PUT /items/{id}` kalon nga `VaultItemController.update()` te `VaultItemService.update()`. Shërbimi kontrollon që roli të jetë të paktën Editor, validon formatin e ciphertext-it, kontrollon versionin dhe ruan ndryshimin. Përdoruesi merr `ItemResponse`, jo entity-n e databazës.

DTO na lejon të kthejmë vetëm fushat që klienti ka nevojë. P.sh. hash-i i account password nuk kthehet kurrë në përgjigjet për përdoruesin. Entity-t nuk serializohen direkt si JSON.

Në frontend, `pages` janë ekranet, `components` janë pjesët e tyre, `services` thërrasin API-në, ndërsa `useVault` koordinon gjendjen dhe veprimet. `shared/crypto.ts` përdoret edhe nga web app-i, edhe nga extension-i. Kjo e mban enkriptimin në një vend.

## Dy fjalëkalimet: pse janë të ndryshme

**Account password** përgjigjet në pyetjen: “A je përdoruesi i kësaj llogarie?” Ai dërgohet te API-ja dhe krahasohet me hash-in. Për një deployment real, transporti duhet të jetë HTTPS.

**Master password** përgjigjet në pyetjen: “A mund ta hapësh vault-in?” Ai përdoret lokalisht për të derivuar një çelës AES që dekripton private key. Nuk dërgohet në rrjet. Në regjistrim, UI kërkon që këto dy fjalëkalime të jenë të ndryshme.

Hashing është një drejtim: përdoret për kontrollimin e login-it. Enkriptimi është i kthyeshëm me çelësin e duhur: duhet për kredencialet, sepse përdoruesi ka nevojë t'i lexojë dhe t'i plotësojë.

## Ndiqe një kredencial nga fillimi deri në fund

1. Në `CredentialForm`, Alice shkruan titullin, username-in dhe password-in.
2. `useVault.saveEntry()` thërret `newItem()` në `shared/crypto.ts`.
3. `newItem()` krijon një çelës AES të rastësishëm dhe enkripton gjithë objektin me AES-GCM.
4. Çelësi AES mbështillet me public key të Alice me RSA-OAEP.
5. `vaultService.create()` dërgon vetëm ciphertext, nonce dhe wrapped key.
6. Backend-i krijon `VaultItem` dhe grant-in e Owner-it në një transaksion.
7. Kur hapet vault-i, klienti merr të dhënat e enkriptuara, përdor private key për çelësin AES dhe dekripton kredencialin lokalisht.

Nonce është një vlerë e re e rastësishme për çdo enkriptim. Salt është vlera e rastësishme për derivimin nga password-i. Salt dhe nonce mund të ruhen në server; ato nuk janë çelësa sekretë.

## Si funksionon ndarja

Alice ka një kredencial me një çelës AES. Për ta ndarë me Bob, klienti merr public key të Bob dhe enkripton një kopje të çelësit AES me të. Backend-i krijon grant-in e Bob me rolin e zgjedhur. Bob e hap çelësin AES me private key të vet dhe lexon të njëjtin ciphertext.

Përdorim AES për objektin dhe RSA vetëm për çelësin e vogël AES. Kjo shmang kufijtë e madhësisë së RSA-së dhe përdor mekanizma standardë të browser-it. Nuk kemi shkruar algoritmin AES apo RSA vetë: i thërrasim përmes Web Crypto API.

| Roli | Lexon / autofill | Ndryshon | Ndan më tutje | Fshin |
| --- | --- | --- | --- | --- |
| Viewer | Po | Jo | Jo | Jo |
| Editor | Po | Po | Jo | Jo |
| Admin | Po | Po | Po | Jo |
| Owner | Po | Po | Po | Po |

UI i fsheh veprimet që s'lejohen. Backend-i i kontrollon prapë në çdo kërkesë, sepse një përdorues mund ta anashkalojë UI-në me një kërkesë direkte HTTP.

Kur hiqet qasja, klienti krijon çelës të ri AES, ri-enkripton kredencialin dhe ua mbështjell çelësin vetëm përdoruesve që mbesin. Backend-i kontrollon që procesi të mos ndryshojë rolet ose ta largojë Owner-in. Një password që Bob e ka parë më herët nuk mund të fshihet nga kujtesa e tij; për atë rast duhet ndryshuar vetë password-i në faqen përkatëse.

## Si funksionon extension-i

- `popup.ts` ofron login, unlock, kërkim dhe kopjim.
- `background.ts` mban koordinimin, lexon kredencialet e enkriptuara, dekripton në kontekst të besuar dhe kontrollon domain-in.
- `content.ts` punon në faqen e internetit: vendos ikonat dhe plotëson fushat pas zgjedhjes së përdoruesit. Nuk merr gjithë vault-in ose private key.
- Manifest V3 përdor service worker. Ai mund të ndalet nga Chrome, prandaj çelësi i përkohshëm është në `chrome.storage.session`, jo vetëm në një variabël të worker-it dhe jo në storage të përhershëm.

Domain-i kontrollohet me URL parsing dhe public suffix list. `app.github.com` mund të përputhet me një login të ruajtur për `github.com`; `github.com.evil.test` nuk përputhet. HTTP lejohet për testimin lokal; për faqet e tjera kërkohet HTTPS. Autofill e plotëson vetëm kredencialin që përdoruesi zgjedh dhe nuk e dorëzon formularin.

Save/Update prompt shfaqet pas dorëzimit të një formulari standard login-i. Për një credential të ri, përdoruesi zgjedh `Personal vault` ose një `Team / Collection`; kur zgjedhet team-i, klienti krijon wrapped key për çdo anëtar me public key-n e tij. Ruajtja kryhet vetëm pasi përdoruesi zgjedh Save ose Update. Extension-i nuk pretendon se e di a pati sukses login-i i faqes. Në web vault, details dhe edit shfaqin ku është ruajtur credential-i.

Nëse një faqe përdor “Continue with Google”, password-i i Google nuk i dërgohet asaj faqeje. Për këtë arsye Team Vault nuk mund ta kapë nga Facebook-u dhe nuk duhet ta kapë. Për demo përdor një formular ku faqja e ka username/password-in e vet, si `http://localhost:8083`.

## Çka tregojnë testet

Testet e klientit kontrollojnë derivimin, dekriptimin me çelësin e duhur, refuzimin e master password-it të gabuar, rrotullimin e çelësit, domain-et dhe TOTP. Testet Java kontrollojnë rolet dhe që një kërkesë e manipuluar nuk mund ta ngritë rolin e vet.

`npm run smoke` teston API-në reale me PostgreSQL. `npm run test:chrome` teston web app-in dhe extension-in në Google Chrome. Për të treguar që databaza nuk ka plaintext, kontrollo kolonat `ciphertext`, `nonce` dhe `wrapped_key`; mos thuaj se një screenshot i ciphertext-it përbën audit të plotë sigurie.

`@Version` mbron nga ndryshime të vjetruara: nëse dy përdorues ndryshojnë të njëjtin kredencial, kërkesa me versionin e vjetër merr 409 dhe duhet ta rifreskojë të dhënën. `@Transactional` siguron që ndryshimet e lidhura, si kredenciali me grant-et e tij, të ruhen së bashku ose të kthehen të gjitha mbrapa.

## Një demonstrim prej 8–10 minutash

1. Nise projektin dhe ekzekuto `npm run seed`. Hape Alice në Chrome dhe Bob në një profil tjetër/incognito.
2. Trego një kredencial, kërkimin, kategorinë dhe secure notes. Trego që Lock kërkon master password përsëri.
3. Ndaje një kredencial personal me Bob si Viewer. Provo leximin dhe trego se s'ka Save/Share.
4. Ndrysho rolin në Editor. Bob e kyç dhe e hap përsëri vault-in për të rifreskuar lejet, pastaj ndryshon shënimet.
5. Trego një koleksion ekipi dhe ndryshimin/heqjen e një anëtari.
6. Hape `http://localhost:8083`, kyçe extension-in me Alice, kliko ikonën dhe zgjidh kredencialin. Provo Save/Update me vlera testuese.
7. Trego folderët dhe ndiq `Controller → Service → Repository → Entity`, pastaj `saveEntry → newItem → API`.
8. Trego testet dhe përmend dy kufij realë: s'ka master-password recovery dhe revokimi s'mund ta bëjë dikë ta harrojë një password të parë.

## Pyetje që mund të të bëhen

**Pse një repo?** Është një produkt i vogël që e zhvilloj vetëm. Ndryshimet në API, web dhe extension mund të rishikohen së bashku.

**Pse public/private keys?** Për të ndarë qasje pa dërguar master password-in ose private key te përdoruesi tjetër.

**Pse token i rastësishëm në vend të JWT?** Për këtë demo, një session token me skadim në DB është i mjaftueshëm dhe logout-i e revokon menjëherë. Nuk kemi nevojë për shërbime që verifikojnë JWT në mënyrë të pavarur.

**Çka do përmirësoje për production?** HTTPS, verifikim email-i dhe MFA, verifikim të identitetit të public keys, plan recovery pa zbuluar master password-in, audit sigurie, kufizim lejesh për extension-in dhe monitorim/backup. Këto janë punë shtesë, jo pretendime për këtë demo.

**A mbron E2EE nga XSS?** Jo. Nëse kodi në browser komprometohet kur vault-i është i hapur, ai mund të lexojë plaintext-in. React i escape-on vlerat e shfaqura, prod build ka CSP dhe çelësat s'ruhen në localStorage, por kjo nuk e zëvendëson një audit.

Përgatitu duke hapur vetë çdo funksion të përmendur dhe duke ndryshuar një gjë të vogël, p.sh. kategorinë e parazgjedhur. Nëse mund ta ndjekësh ndryshimin nga UI deri te API dhe ta provosh, shpjegimi yt bëhet shumë më i sigurt.
