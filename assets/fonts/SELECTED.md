# Selected typography

Captain choice B: Fraunces headings and Manrope UI/body. The Crystal Ball wordmark retains the original IM Fell English Italic. Both selected families are OFL; their upstream licenses are adjacent.

The shipped TTFs are static instances generated with fontTools from the original Google Fonts variable files retained in public/concepts/font-assets:

- Fraunces: wght=400, opsz=24, SOFT=0, WONK=1.
- Manrope: wght=400.

Static files deliberately support this app's Expo SDK 57 on native as well as web. Expo documents native variable-font support in SDK 58 and later: https://docs.expo.dev/develop/user-interface/fonts/ . The original concept page remains a comparison prototype with variable fonts; production uses these fixed instances for consistent rendering. Normal UI emphasis uses the existing fontWeight styles. No system fonts are installed.
