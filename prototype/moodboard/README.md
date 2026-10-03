# Moodboard (3D-prototype)

Frittstående prototype av et 3D-kontor der brukeren trykker på et møbel, kameraet zoomer inn,
og brukeren velger farger og materialer. Valgene samles i et moodboard som kan lagres som bilde
eller sendes til en rådgiver (i prototypen sendes ingenting).

- `moodboard.html`: hele prototypen. three.js r128 lastes fra CDN. `LOGO_DATA_URI` byttes med
  `public/logo.png` som data-URI ved publisering.
- Møblene er generiske og bygget av enkle former i koden. Ingen produsentmodeller eller -bilder.
- Ikke lenket fra nettstedet. Hvis den godkjennes: flyttes til `/moodboard` som egen side som lastes
  først når den åpnes, og «Send til en rådgiver» kobles til `POST /api/lead`.
