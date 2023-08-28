import { vnodeTypeCheck } from "../const.js"
import { unmount } from "./unmount.js"
import {mountElement, patchElement} from './element.js'
import { mountComponent, patchComponent } from "./component.js"
import {mountText, patchText} from './text.js'
import {mountFragement, patchFragment} from './fragement.js'
// 对比新旧节点 打补丁
export const patch = (n1, n2, container, anchor) => {
    if(n1 && n1.type !== n2.type) {
        // 类型不一样，可以直接删除老节点，挂载新节点
        unmount(n1)
        n1 = null
    }

    // 下面的全是类型一样的情况了，这时进入到真正的patch
    const {type} = n2
    const vnodeType = vnodeTypeCheck(type)
    if(vnodeType.isElement) {
        // 标签类型
        if(!n1) {
            // 没有存之前的，证明是第一次挂载
            mountElement(n2, container, anchor)
        } else {
            // 有的话进入两个vnode的对比
            patchElement(n1, n2)
        }
    } else if(vnodeType.isComp) {
        // 组件类型 
        if(!n1) {
            mountComponent(n2, container, anchor)
        } else {
            patchComponent(n1, n2, anchor)
        }
    } else if(vnodeType.isText) {
        // 文本节点类型
        if(!n1) {
            mountText(n2, container, anchor)
        } else {
            patchText(n1, n2, container)
        }
    } else if(vnodeType.isFragement) {
        // 只渲染子节点就行了 不用理会标签
        if(!n1) {
            mountFragement(n2, container)
        } else {
            patchFragment(n1, n2, container)
        }
    }
}