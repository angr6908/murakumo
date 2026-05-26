import type { OdFileObject } from '../../types'
import { FC } from 'react'

import { FontAwesomeIcon } from '../../utils/fontawesome'

import { getFileIcon } from '../../utils/getFileIcon'
import { formatModifiedDateTime, humanFileSize } from '../../utils/fileDetails'

import DownloadButtonGroup from '../DownloadBtnGtoup'
import { DownloadBtnContainer, PreviewContainer } from './Containers'

const DefaultPreview: FC<{ file: OdFileObject }> = ({ file }) => {
  const details = [
    ['Last modified', formatModifiedDateTime(file.lastModifiedDateTime)],
    ['File size', humanFileSize(file.size)],
    ['MIME type', file.file?.mimeType ?? 'Unavailable'],
  ]
  const hashes = [
    ['Quick XOR', file.file.hashes?.quickXorHash],
    ['SHA1', file.file.hashes?.sha1Hash],
    ['SHA256', file.file.hashes?.sha256Hash],
  ]

  return (
    <div>
      <PreviewContainer>
        <div className="items-center px-5 py-4 md:flex md:space-x-8">
          <div className="rounded-lg border border-gray-900/10 px-8 py-20 text-center dark:border-gray-500/30">
            <FontAwesomeIcon icon={getFileIcon(file.name, { video: Boolean(file.video) })} />
            <div className="mt-6 line-clamp-3 text-sm font-medium md:w-28">{file.name}</div>
          </div>

          <div className="flex flex-col space-y-2 py-4 md:flex-1">
            {details.map(([label, value]) => (
              <div key={label}>
                <div className="py-2 text-xs font-medium uppercase opacity-80">{label}</div>
                <div>{value}</div>
              </div>
            ))}

            <div>
              <div className="py-2 text-xs font-medium uppercase opacity-80">{'Hashes'}</div>
              <table className="block w-full overflow-scroll text-sm whitespace-nowrap md:table">
                <tbody>
                  {hashes.map(([label, value]) => (
                    <tr key={label} className="border-y bg-white dark:border-gray-700 dark:bg-gray-900">
                      <td className="bg-gray-50 px-3 py-1 text-left text-xs font-medium tracking-wider text-gray-700 uppercase dark:bg-gray-800 dark:text-gray-400">
                        {label}
                      </td>
                      <td className="px-3 py-1 font-mono whitespace-nowrap text-gray-500 dark:text-gray-400">
                        {value ?? 'Unavailable'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </PreviewContainer>
      <DownloadBtnContainer>
        <DownloadButtonGroup />
      </DownloadBtnContainer>
    </div>
  )
}

export default DefaultPreview
