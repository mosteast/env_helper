import { env_set, env_unset, reload_env_file } from '../index'
import { resolve } from 'path'
import { readFileSync } from 'fs'
import { truncate } from 'fs-extra'

const path = resolve(__dirname, '.env.empty.test')
beforeEach(async () => {
  await truncate(path)
})

it('env_set', async () => {
  await env_set('a', 1, { path })
  expect(readFileSync(path).toString().trim()).toBe('a=1')
  await env_set('b', 2, { path })
  expect(readFileSync(path).toString().trim()).toBe('a=1\nb=2')
})

it('env_unset', async () => {
  await env_set('a', 1, { path })
  await env_set('b', 2, { path })
  expect(readFileSync(path).toString().trim()).toBe('a=1\nb=2')
  await env_unset('b', { path })
  expect(readFileSync(path).toString().trim()).toBe('a=1')
})

it('reload_env', async () => {
  reload_env_file(resolve(__dirname, '.env.reload_env.test'))
  expect(process.env.aa).toBe('1')
  expect(process.env.bb).toBe('2')
})
