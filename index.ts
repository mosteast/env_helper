import { pwd } from 'shelljs'
import { resolve } from 'path'
import { readFile, stat, writeFile } from 'fs-extra'
import { DotenvParseOutput, parse } from 'dotenv'

interface T_opt_edit_env {
  action: 'set' | 'unset'
  key: string
  value?: string | number
  /**
   * .env file path
   */
  path?: string
}

/**
 * Set env variable by editing env file
 */
export async function env_file_edit(opt: T_opt_edit_env) {
  let { action, key, value, path } = { ...opt }
  path = path || resolve(pwd().toString(), '.env')
  const map: DotenvParseOutput = parse(await readFile(path)) || {}
  console.log(map)

  switch (action) {
    case 'set':
      map[key] = '' + value
      break
    case 'unset':
      delete map[key]
      break
    default:
      throw new Error(`Invalid action ${action}`)
  }

  await writeFile(path, env_encode(map))
}

export function env_encode(map: DotenvParseOutput): string {
  let r = ''

  for (let it in map) {
    r += `${it}=${map[it]}\n`
  }

  return r.trim()
}

export async function env_set(key: string, value: number | string, opt?: Partial<T_opt_edit_env>) {
  await env_file_edit({ action: 'set', key, value, ...opt })
}

export async function env_unset(key: string, opt?: Partial<T_opt_edit_env>) {
  await env_file_edit({ action: 'unset', key, ...opt })
}

export function reload_env_file(path: string) {
  stat(path, e => {
    if (e) {
      console.warn(`.env file not found: ${path}`)
    }
  })
  require('dotenv').config({ path })
  process.env.____ENV_LOADED____ = '1'
}

export function load_env_once(path: string) {
  if (process.env.____ENV_LOADED____ == '1') {return}

  reload_env_file(path)
}
