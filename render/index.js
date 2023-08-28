import { patch } from "../patch/index.js"
import { setPaintMethods } from "../patch/utils.js"
import {unmount} from '../patch/unmount.js'
export const createRenderer = (options = {}) => {

    // 注入当前平台的绘制方法，比如浏览器上就是dom操作
    setPaintMethods(options)

    const renderer = (vnode, container) => {
        if(vnode) {
            patch(container._vnode, vnode, container)
        } else {
            // 为null时证明想要 销毁组件
            if(container._vnode) {
                unmount(container._vnode)
            }
        }
        container._vnode = vnode
    }
    return {
        renderer
    }
}