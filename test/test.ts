import {
  modify_env_file,
  env_merge,
  env_replace,
  env_set,
  env_unset,
  reload_env, env_get,
} from '../index'
import { resolve } from 'path'
import { readFileSync } from 'fs'
import { truncate } from 'fs-extra'
import { Invalid_argument } from '../error/invalid_argument'

const path = resolve(__dirname, '.env.empty.test')

async function clear() {
  await truncate(path)
}

beforeEach(async () => {await clear()})
afterEach(async () => {await clear()})

it('env_set', async () => {
  await env_set('a', '1', { path })
  expect(readFileSync(path).toString().trim()).toBe('a=1')
  expect(await env_get({ key: 'a', path })).toBe('1')

  await env_set('b', '2', { path })
  expect(readFileSync(path).toString().trim()).toBe('a=1\nb=2')
  expect(await env_get({ key: 'a', path })).toBe('1')
  expect(await env_get({ key: 'b', path })).toBe('2')

  await env_set({
    key: 'c',
    value: '3',
    path,
  })
  expect(readFileSync(path).toString().trim()).toBe('a=1\nb=2\nc=3')
  expect(await env_get({ key: 'a', path })).toBe('1')
  expect(await env_get({ key: 'b', path })).toBe('2')
  expect(await env_get({ key: 'c', path })).toBe('3')

})

it('env_unset', async () => {
  await env_set('a', '1', { path })
  await env_set('b', '2', { path })
  expect(readFileSync(path).toString().trim()).toBe('a=1\nb=2')
  await env_unset('b', { path })
  expect(readFileSync(path).toString().trim()).toBe('a=1')
})

it('env_merge', async () => {
  await env_set('a', '1', { path })
  await env_set('b', '2', { path })
  expect(readFileSync(path).toString().trim()).toBe('a=1\nb=2')
  await env_merge({ b: '3', c: '4' }, { path })
  expect(readFileSync(path).toString().trim()).toBe('a=1\nb=3\nc=4')
})

it('env_replace', async () => {
  await env_set('a', '1', { path })
  await env_set('b', '2', { path })
  expect(readFileSync(path).toString().trim()).toBe('a=1\nb=2')
  await env_replace({ c: '3', d: '4' }, { path })
  expect(readFileSync(path).toString().trim()).toBe('c=3\nd=4')
})

it('reload_env', async () => {
  reload_env(resolve(__dirname, '.env.reload_env.test'), true)
  expect(process.env.aa).toBe('1')
  expect(process.env.bb).toBe('2')
  reload_env(resolve(__dirname, '.env.reload_env.test2'), true)
  expect(process.env.aa).toBe('11')
  expect(process.env.bb).toBe('22')
  env_set('aa', '111')
})

it('throws with invalid action', async () => {
  await expect(modify_env_file({
    // @ts-ignore
    action: 'invalid_action',
    path,
  })).rejects.toThrow(Invalid_argument)
})
