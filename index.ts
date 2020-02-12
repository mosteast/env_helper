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

export interface T_opt_env_operation {
  /**
   * .env file path
   * default: working directory
   */
  path?: string
}

export interface T_opt_parse_env extends T_opt_env_operation {}

export interface T_opt_env_get extends T_opt_parse_env {}

export interface T_opt_modify_env extends T_opt_env_operation {
  action?: A

  /**
   * Whether reload process.env by .env file
   * default: true
   */
  reload?: boolean
}

export interface T_opt_edit_env_set extends T_opt_modify_env {
  key?: string
  value?: string
}

export interface T_opt_edit_env_unset extends T_opt_modify_env {
  key?: string
}

export interface T_opt_edit_env_merge extends T_opt_modify_env {
  map?: DotenvParseOutput,
}

export interface T_opt_edit_env_replace extends T_opt_modify_env {
  map?: DotenvParseOutput,
}

/**
 * File: 'a=1\nb=2' ==> {a: '1', b: '2'}
 * @param opt
 */
export async function parse_env_file(opt?: T_opt_parse_env): Promise<DotenvParseOutput> {
  const { path } = { path: resolve(pwd().toString(), '.env'), ...opt }
  return parse(await readFile(path)) || {}
}

/**
 * Set env variable by editing env file
 */
export async function modify_env_file(opt: T_opt_edit_env_set | T_opt_edit_env_unset | T_opt_edit_env_merge | T_opt_edit_env_replace) {
  let { action, key, value, map, path, reload } =
        { reload: true, path: resolve(pwd().toString(), '.env'), ...opt }

  let r = await parse_env_file(opt)

  switch (action) {
    case A.set:
      r[key] = '' + value
      break
    case A.unset:
      delete r[key]
      break
    case A.merge:
      if ( ! map) {throw new Invalid_argument({ merge: map })}
      r = { ...r, ...map }
      break
    case A.replace:
      if ( ! map) {throw new Invalid_argument({ merge: map })}
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
 * {a: '1', b: '2'} ==> 'a=1\nb=2'
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
 * Get one from .env file (NOT from process.env)
 * @param key
 * @param opt
 */
export async function env_get(key, opt?: T_opt_env_get): Promise<string>
export async function env_get(opt?: T_opt_env_get): Promise<string>
export async function env_get(a, b?): Promise<string> {
  let opt = { action: A.set, ...b }
  if (typeof a === 'string') {
    opt.key = a
  } else {
    opt = { ...opt, ...a }
  }

  return (await parse_env_file(opt))[opt.key]
}

/**
 * Set one in .env file
 * @param key
 * @param value
 * @param opt
 */
export async function env_set(key: string, value: string, opt?: T_opt_edit_env_set)
export async function env_set(opt?: T_opt_edit_env_set)
export async function env_set(a, b?, c?) {
  let opt: T_opt_edit_env_set = { action: A.set, ...c }

  if (typeof a === 'string') {
    opt.key = a
    opt.value = b
  } else {
    opt = { ...opt, ...a }
  }

  await modify_env_file(opt)
}

/**
 * Unset one in .env file
 * @param key
 * @param opt
 */
export async function env_unset(key: string, opt?: T_opt_edit_env_unset) {
  await modify_env_file({
    action: A.unset,
    key, ...opt,
  })
}

/**
 * Merge a object to .env file
 * @param merge
 * @param opt
 */
export async function env_merge(map: DotenvParseOutput, opt?: T_opt_edit_env_merge) {
  await modify_env_file({
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
export async function env_replace(map: DotenvParseOutput, opt?: T_opt_edit_env_replace) {
  await modify_env_file({
    action: A.replace,
    map,
    ...opt,
  })
}

/**
 * Reload env from a .env file
 * Default path is cwd
 * @param path
 */
export function reload_env(path?: string) {
  path = path || resolve(pwd().toString(), '.env')

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
