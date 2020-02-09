import { pwd } from 'shelljs'
import { resolve } from 'path'
import { readFile, stat, writeFile } from 'fs-extra'
import { DotenvParseOutput, parse } from 'dotenv'
import { Invalid_argument } from './error/invalid_argument'

enum A {
  set     = 'set',
  unset   = 'unset',
  merge   = 'merge',
  replace = 'replace',
}

export const N_edit_env_action = A

interface T_opt_edit_env {
  action: A
  /**
   * .env file path
   */
  path?: string
  /**
   * Whether reload process.env by .env file
   */
  reload?: boolean
}

interface T_opt_edit_env_set extends T_opt_edit_env {
  action: A.set
  key: string
  value: string
}

interface T_opt_edit_env_unset extends T_opt_edit_env {
  action: A.unset
  key: string
}

interface T_opt_edit_env_merge extends T_opt_edit_env {
  action: A.merge
  map: DotenvParseOutput,
}

interface T_opt_edit_env_replace extends T_opt_edit_env {
  action: A.replace
  map: DotenvParseOutput,
}

/**
 * Set env variable by editing env file
 */
export async function env_file_edit(opt: T_opt_edit_env_set | T_opt_edit_env_unset | T_opt_edit_env_merge | T_opt_edit_env_replace) {
  let { action, key, value, map, path, reload } = { reload: false, ...opt }

  path = path || resolve(pwd().toString(), '.env')
  let r: DotenvParseOutput = parse(await readFile(path)) || {}

  switch (action) {
    case A.set:
      r[key] = '' + value
      break
    case A.unset:
      delete r[key]
      break
    case A.merge:
      if (!map) {throw new Invalid_argument({ merge: map })}
      r = { ...r, ...map }
      break
    case A.replace:
      if (!map) {throw new Invalid_argument({ merge: map })}
      r = map
      break
    default:
      throw new Invalid_argument({ action })
  }

  await writeFile(path, env_encode(r))

  if (reload) {
    reload_env(path)
  }
}

/**
 * {a: 1, b: 2} ==> 'a=1\nb=2'
 * @param map
 */
export function env_encode(map: DotenvParseOutput): string {
  let r = ''

  for (let it in map) {
    r += `${it}=${map[it]}\n`
  }

  return r.trim()
}

/**
 * Set an item in .env file
 * @param key
 * @param value
 * @param opt
 */
export async function env_set(key: string, value: string, opt?: Partial<T_opt_edit_env_set>) {
  await env_file_edit({
    action: A.set,
    key,
    value, ...opt,
  })
}

/**
 * Unset an item in .env file
 * @param key
 * @param opt
 */
export async function env_unset(key: string, opt?: Partial<T_opt_edit_env_unset>) {
  await env_file_edit({
    action: A.unset,
    key, ...opt,
  })
}

/**
 * Merge a object to .env file
 * @param merge
 * @param opt
 */
export async function env_merge(map: DotenvParseOutput, opt?: Partial<T_opt_edit_env_merge>) {
  await env_file_edit({
    action: A.merge,
    map,
    ...opt,
  })
}

/**
 * Replace all pairs in .env file
 * @param map
 * @param opt
 */
export async function env_replace(map: DotenvParseOutput, opt?: Partial<T_opt_edit_env_replace>) {
  await env_file_edit({
    action: A.replace,
    map,
    ...opt,
  })
}

/**
 * Reload env from a .env file
 * @param path
 */
export function reload_env(path: string) {
  stat(path, e => {
    if (e) {
      console.warn(`.env file not found: ${path}`)
    }
  })
  require('dotenv').config({ path })
  process.env.____ENV_LOADED____ = '1'
}

/**
 * Reload if not loaded
 * @param path - Default to pwd() + '.env'
 */
export function load_env_once(path?: string) {
  if (process.env.____ENV_LOADED____ == '1') {return}

  reload_env(path)
}
