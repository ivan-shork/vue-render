import { createText, insert, setText } from "./utils.js"

export const mountText = (vnode, container, anchor = null) => {
    const el = vnode.el = createText(vnode.children)
    insert(el, container)
}


export const patchText = (n1, n2, container) => {
    //! 直接复用节点去修改属性，而不是卸载老节点，挂载新节点
    const el = n2.el = n1.el
    if(n2.children !== n1.children) {
        setText(el, n2.children)
    }
}