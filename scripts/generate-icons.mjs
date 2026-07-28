import sharp from 'sharp'
import { mkdirSync } from 'fs'

mkdirSync('public/icons', { recursive: true })

await sharp('public/icons/icon.png')
  .resize(512, 512)
  .png()
  .toFile('public/icons/icon-512.png')

await sharp('public/icons/icon.png')
  .resize(192, 192)
  .png()
  .toFile('public/icons/icon-192.png')

console.log('Done')
