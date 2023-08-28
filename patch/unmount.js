import { FRAGEMENT_TYPE } from "../const.js"

export const unmount = (vnode) => {
    if(vnode.type === FRAGEMENT_TYPE) {
        vnode.children.forEach(c => unmount(c))
    } else {
        const el = vnode.el
        const parentNode = el.parentNode
        if(parentNode) parentNode.removeChild(el)
    }
}