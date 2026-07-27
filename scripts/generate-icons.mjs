import sharp from 'sharp'
import { mkdirSync } from 'fs'

mkdirSync('public/icons', { recursive: true })

await sharp('public/icons/icon-512.png')
  .resize(192, 192)
  .png()
  .toFile('public/icons/icon-192.png')

console.log('Icons generated successfully')
