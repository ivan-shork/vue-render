import { patch } from "./index.js"
import { patchChildren } from './diff.js'
export const mountFragement = (vnode, container) => {
    vnode.children.forEach(node => {
        patch(null, node, container)
    })
}

export const patchFragment = (n1, n2, container) => {
    patchChildren(n1, n2, container)
}