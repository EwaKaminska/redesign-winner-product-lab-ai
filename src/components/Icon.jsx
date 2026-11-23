import searchIcon from '@/assets/icons/search.svg'
import plusIcon from '@/assets/icons/plus.svg'
import uploadIcon from '@/assets/icons/upload.svg'
import tagRemoveIcon from '@/assets/icons/tag-remove.svg'
import closeIcon from '@/assets/icons/close.svg'
import expandIcon from '@/assets/icons/expand.svg'

// Icons exported from Figma. Sizes match each SVG's root width/height.
const ICONS = {
  search: { src: searchIcon, size: 20 },
  plus: { src: plusIcon, size: 24 },
  upload: { src: uploadIcon, size: 20 },
  tagRemove: { src: tagRemoveIcon, size: 20 },
  close: { src: closeIcon, size: 20 },
  expand: { src: expandIcon, size: 20 },
}

export function Icon({ name, className }) {
  const icon = ICONS[name]
  return (
    <img
      src={icon.src}
      width={icon.size}
      height={icon.size}
      alt=""
      aria-hidden
      draggable={false}
      className={className}
    />
  )
}
