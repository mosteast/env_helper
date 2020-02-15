import { E } from '@mosteast/e'

export class Invalid_path extends E {
  constructor(path: string) {
    super()

    this.message = `Invalid path: ${path}`
  }
}
