'use client'
import type { FC } from 'react'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Cog8ToothIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useBoolean } from 'ahooks'
import type { Timeout } from 'ahooks/lib/useRequest/src/types'
import { useContext } from 'use-context-selector'
import Panel from '../base/feature-panel'
import OperationBtn from '../base/operation-btn'
import EditModal from './config-modal'
import IconTypeIcon from './input-type-icon'
import type { IInputTypeIconProps } from './input-type-icon'
import s from './style.module.css'
import { BracketsX as VarIcon } from '@/app/components/base/icons/src/vender/line/development'
import Tooltip from '@/app/components/base/tooltip'
import type { PromptVariable } from '@/models/debug'
import { DEFAULT_VALUE_MAX_LEN, getMaxVarNameLength } from '@/config'
import { checkKeys, getNewVar } from '@/utils/var'
import Switch from '@/app/components/base/switch'
import Toast from '@/app/components/base/toast'
import { HelpCircle } from '@/app/components/base/icons/src/vender/line/general'
import ConfirmModal from '@/app/components/base/confirm/common'
import ConfigContext from '@/context/debug-configuration'
import { AppType } from '@/types/app'

export type IConfigVarProps = {
  promptVariables: PromptVariable[]
  readonly?: boolean
  onPromptVariablesChange?: (promptVariables: PromptVariable[]) => void
}

let conflictTimer: Timeout

const ConfigVar: FC<IConfigVarProps> = ({ promptVariables, readonly, onPromptVariablesChange }) => {
  const { t } = useTranslation()
  const {
    mode,
    dataSets,
  } = useContext(ConfigContext)

  const hasVar = promptVariables.length > 0
  const promptVariableObj = (() => {
    const obj: Record<string, boolean> = {}
    promptVariables.forEach((item) => {
      obj[item.key] = true
    })
    return obj
  })()

  const updatePromptVariable = (key: string, updateKey: string, newValue: string | boolean) => {
    const newPromptVariables = promptVariables.map((item) => {
      if (item.key === key) {
        return {
          ...item,
          [updateKey]: newValue,
        }
      }

      return item
    })
    onPromptVariablesChange?.(newPromptVariables)
  }

  const batchUpdatePromptVariable = (key: string, updateKeys: string[], newValues: any[], isParagraph?: boolean) => {
    const newPromptVariables = promptVariables.map((item) => {
      if (item.key === key) {
        const newItem: any = { ...item }
        updateKeys.forEach((updateKey, i) => {
          newItem[updateKey] = newValues[i]
        })
        if (isParagraph) {
          delete newItem.max_length
          delete newItem.options
        }
        return newItem
      }

      return item
    })

    onPromptVariablesChange?.(newPromptVariables)
  }
  const updatePromptKey = (index: number, newKey: string) => {
    clearTimeout(conflictTimer)
    const { isValid, errorKey, errorMessageKey } = checkKeys([newKey], true)
    if (!isValid) {
      Toast.notify({
        type: 'error',
        message: t(`appDebug.varKeyError.${errorMessageKey}`, { key: errorKey }),
      })
      return
    }

    const newPromptVariables = promptVariables.map((item, i) => {
      if (i === index) {
        return {
          ...item,
          key: newKey,
        }
      }
      return item
    })

    conflictTimer = setTimeout(() => {
      const isKeyExists = promptVariables.some(item => item.key.trim() === newKey.trim())
      if (isKeyExists) {
        Toast.notify({
          type: 'error',
          message: t('appDebug.varKeyError.keyAlreadyExists', { key: newKey }),
        })
      }
    }, 1000)

    onPromptVariablesChange?.(newPromptVariables)
  }

  const updatePromptNameIfNameEmpty = (index: number, newKey: string) => {
    if (!newKey)
      return
    const newPromptVariables = promptVariables.map((item, i) => {
      if (i === index && !item.name) {
        return {
          ...item,
          name: newKey,
        }
      }
      return item
    })

    onPromptVariablesChange?.(newPromptVariables)
  }

  const handleAddVar = () => {
    const newVar = getNewVar('')
    onPromptVariablesChange?.([...promptVariables, newVar])
  }

  const [isShowDeleteContextVarModal, { setTrue: showDeleteContextVarModal, setFalse: hideDeleteContextVarModal }] = useBoolean(false)
  const [removeIndex, setRemoveIndex] = useState<number | null>(null)
  const didRemoveVar = (index: number) => {
    onPromptVariablesChange?.(promptVariables.filter((_, i) => i !== index))
  }

  const handleRemoveVar = (index: number) => {
    const removeVar = promptVariables[index]

    if (mode === AppType.completion && dataSets.length > 0 && removeVar.is_context_var) {
      showDeleteContextVarModal()
      setRemoveIndex(index)
      return
    }
    didRemoveVar(index)
  }

  const [currKey, setCurrKey] = useState<string | null>(null)
  const currItem = currKey ? promptVariables.find(item => item.key === currKey) : null
  const [isShowEditModal, { setTrue: showEditModal, setFalse: hideEditModal }] = useBoolean(false)
  const handleConfig = (key: string) => {
    setCurrKey(key)
    showEditModal()
  }

  return (
    <Panel
      className="mt-4"
      headerIcon={
        <VarIcon className='w-4 h-4 text-primary-500'/>
      }
      title={
        <div className='flex items-center'>
          <div className='mr-1'>{t('appDebug.variableTitle')}</div>
          {!readonly && (
            <Tooltip htmlContent={<div className='w-[180px]'>
              {t('appDebug.variableTip')}
            </div>} selector='config-var-tooltip'>
              <HelpCircle className='w-[14px] h-[14px] text-gray-400' />
            </Tooltip>
          )}
        </div>
      }
      headerRight={!readonly ? <OperationBtn type="add" onClick={handleAddVar} /> : null}
    >
      {!hasVar && (
        <div className='pt-2 pb-1 text-xs text-gray-500'>{t('appDebug.notSetVar')}</div>
      )}
      {hasVar && (
        <div className='rounded-lg border border-gray-200 bg-white overflow-x-auto'>
          <table className={`${s.table} min-w-[440px] max-w-full border-collapse border-0 rounded-lg text-sm`}>
            <thead className="border-b  border-gray-200 text-gray-500 text-xs font-medium">
              <tr className='uppercase'>
                <td>{t('appDebug.variableTable.key')}</td>
                <td>{t('appDebug.variableTable.name')}</td>
                {!readonly && (
                  <>
                    <td>{t('appDebug.variableTable.optional')}</td>
                    <td>{t('appDebug.variableTable.action')}</td>
                  </>
                )}

              </tr>
            </thead>
            <tbody className="text-gray-700">
              {promptVariables.map(({ key, name, type, required }, index) => (
                <tr key={index} className="h-9 leading-9">
                  <td className="w-[160px] border-b border-gray-100 pl-3">
                    <div className='flex items-center space-x-1'>
                      <IconTypeIcon type={type as IInputTypeIconProps['type']} className='text-gray-400' />
                      {!readonly
                        ? (
                          <input
                            type="text"
                            placeholder="key"
                            value={key}
                            onChange={e => updatePromptKey(index, e.target.value)}
                            onBlur={e => updatePromptNameIfNameEmpty(index, e.target.value)}
                            maxLength={getMaxVarNameLength(name)}
                            className="h-6 leading-6 block w-full rounded-md border-0 py-1.5 text-gray-900  placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-gray-200"
                          />
                        )
                        : (
                          <div className='h-6 leading-6 text-[13px] text-gray-700'>{key}</div>
                        )}
                    </div>
                  </td>
                  <td className="py-1 border-b border-gray-100">
                    {!readonly
                      ? (
                        <input
                          type="text"
                          placeholder={key}
                          value={name}
                          onChange={e => updatePromptVariable(key, 'name', e.target.value)}
                          maxLength={getMaxVarNameLength(name)}
                          className="h-6 leading-6 block w-full rounded-md border-0 py-1.5 text-gray-900  placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-gray-200"
                        />)
                      : (
                        <div className='h-6 leading-6 text-[13px] text-gray-700'>{name}</div>
                      )}
                  </td>
                  {!readonly && (
                    <>
                      <td className='w-[84px] border-b border-gray-100'>
                        <div className='flex items-center h-full'>
                          <Switch defaultValue={!required} size='md' onChange={value => updatePromptVariable(key, 'required', !value)} />
                        </div>
                      </td>
                      <td className='w-20  border-b border-gray-100'>
                        <div className='flex h-full items-center space-x-1'>
                          <div className='flex items-center justify-items-center w-6 h-6 text-gray-500 cursor-pointer' onClick={() => handleConfig(key)}>
                            <Cog8ToothIcon width={16} height={16} />
                          </div>
                          <div className='flex items-center justify-items-center w-6 h-6 text-gray-500 cursor-pointer' onClick={() => handleRemoveVar(index)} >
                            <TrashIcon width={16} height={16} />
                          </div>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isShowEditModal && (
        <EditModal
          payload={currItem as PromptVariable}
          isShow={isShowEditModal}
          onClose={hideEditModal}
          onConfirm={({ type, value }) => {
            if (type === 'string')
              batchUpdatePromptVariable(currKey as string, ['type', 'max_length'], [type, value || DEFAULT_VALUE_MAX_LEN])
            else
              batchUpdatePromptVariable(currKey as string, ['type', 'options'], [type, value || []], type === 'paragraph')

            hideEditModal()
          }}
        />
      )}

      {isShowDeleteContextVarModal && (
        <ConfirmModal
          isShow={isShowDeleteContextVarModal}
          title={t('appDebug.feature.dataSet.queryVariable.deleteContextVarTitle', { varName: promptVariables[removeIndex as number]?.name })}
          desc={t('appDebug.feature.dataSet.queryVariable.deleteContextVarTip') as string}
          confirmBtnClassName='bg-[#B42318] hover:bg-[#B42318]'
          onConfirm={() => {
            didRemoveVar(removeIndex as number)
            hideDeleteContextVarModal()
          }}
          onCancel={hideDeleteContextVarModal}
        />
      )}

    </Panel>
  )
}
export default React.memo(ConfigVar)
