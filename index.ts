import { DotenvParseOutput, parse } from 'dotenv'
import { readFileSync } from 'fs'
import { pathExists, readFile, writeFile } from 'fs-extra'
import { resolve } from 'path'
import { pwd } from 'shelljs'
import { Invalid_argument } from './error/invalid_argument'
import { Invalid_path } from './error/invalid_path'
import { T_object } from './type'

enum A {
  set     = 'set',
  unset   = 'unset',
  merge   = 'merge',
  replace = 'replace',
}

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
  if ( ! await pathExists(path)) {
    throw new Invalid_path(path)
  }
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
    reload_env(path, { override: true })
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
export async function env_set(key: string, value: string, opt?: T_opt_edit_env_set): Promise<void>
export async function env_set(opt?: T_opt_edit_env_set): Promise<void>
export async function env_set(a, b?, c?): Promise<void> {
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
export async function env_unset(key: string, opt?: T_opt_edit_env_unset): Promise<void> {
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
export async function env_merge(map: DotenvParseOutput, opt?: T_opt_edit_env_merge): Promise<void> {
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
export async function env_replace(map: DotenvParseOutput, opt?: T_opt_edit_env_replace): Promise<void> {
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
export async function reload_env(path?: string, override?: boolean): Promise<void>
export async function reload_env(path?: string, opt?: T_opt_reload_env): Promise<void>
export async function reload_env(path?: string, opt?: T_opt_reload_env | boolean): Promise<void> {
  if (typeof opt === 'boolean') {
    opt = { override: opt }
  }

  const { override } = { override: false, ...opt }

  path = path || resolve(pwd().toString(), '.env')

  if (override) {
    const o = parse(await readFile(path))
    override_env(o)
  } else {
    require('dotenv').config({ path })
  }

  set_env_loaded(true)
}

export function reload_env_sync(path?: string, override?: boolean): void
export function reload_env_sync(path?: string, opt?: T_opt_reload_env): void
export function reload_env_sync(path?: string, opt?: T_opt_reload_env | boolean): void {
  if (typeof opt === 'boolean') {
    opt = { override: opt }
  }

  const { override } = { override: false, ...opt }

  path = path || resolve(pwd().toString(), '.env')

  if (override) {
    const o = parse(readFileSync(path))
    override_env(o)
  } else {
    require('dotenv').config({ path })
  }

  set_env_loaded(true)
}

export function override_env(obj: T_object) {
  for (let key in obj) {
    process.env[key] = obj[key]
  }
}

/**
 * Reload if not loaded
 * @param path - Default to pwd() + '.env'
 */
export async function load_env_once(path?: string): Promise<void> {
  if (env_loaded()) {return}

  await reload_env(path)
}

export function load_env_once_sync(path?: string): void {
  if (env_loaded()) {return}

  reload_env_sync(path)
}

function env_loaded() {
  return process.env.____ENV_LOADED____ === '1'
}

function set_env_loaded(yes: boolean) {
  if (yes) {
    process.env.____ENV_LOADED____ = '1'
  } else {
    delete process.env.____ENV_LOADED____
  }
}

export interface T_opt_reload_env {
  override?: boolean
}

export { parse as parse_env }
