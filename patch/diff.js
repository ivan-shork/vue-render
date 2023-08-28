import { patch } from "./index.js"
import { unmount } from "./unmount.js"
import { setElementText } from "./utils.js"

 /**
     * 
     * @param {*} n1 
     * @param {*} n2 
     * @param {*} el 
     * 
     * 新旧vnode子节点patch的核心，其实就是 3 * 3 九种情况
     * 新节点和旧节点都有相同的三种情况
     * 1. 没有子节点 2. 子节点是文本 3. 子节点是一组节点
     * 但是有些情况在代码编写时可以做到一种分支条件可以实现，因此实际上不用九种
     */
 export const patchChildren = (n1, n2, el) => {
    const { children: n2Child } = n2 || {}
    const { children: n1Child } = n1 || {}
    if(typeof n2Child === 'string') {
        if(Array.isArray(n1Child)) {
            unmount(n1Child)
        }
        setElementText(el, n2Child)
    } else if(Array.isArray(n2Child )) {
        if(Array.isArray(n1Child)) {
            console.log(n2Child, n1Child);
            // ! 核心diff
            // 全部卸载旧的一组子节点，挂载新的一组子节点 不高效，此处举例
            // n1Child.forEach(child => unmount(child))
            // n2Child.forEach(child => patch(null, child, el))


            // 方式一 见readme 遍历其中children最短的，然后一一对比，然后在找出超出的进行遍历，如果老节点长度大于新节点，则有卸载，反之是挂载
            // 方式二 利用key来复用vnode，并且调整好顺序

            let lastIndex = 0 
            for(let i = 0;i<n2Child.length; i++) {
                const newVnode = n2Child[i]
                let find = false
                for(let j = 0;j < n1Child.length; j++) {
                    const oldVnode = n1Child[j]
                    if(n2Child[i].key === n1Child[j].key) {
                        find = true
                        patch(oldVnode, newVnode, el)
                        if(j < lastIndex) {
                            // 说明vnode对应的真实dom需要移动
                            const prevVnode = n2Child[i - 1]
                            if(prevVnode) {
                                // 找到前一个新的vnode的下一个节点作为猫点，插到它前面去
                                const anchor = prevVnode.el.nextSibling
                                insert(newVnode.el, el, anchor)
                            }
                        } else {
                            lastIndex = j
                        }
                        break
                    }
                }

                // 代表没有找到可以复用的key的新节点，需要进行挂载
                if(!find) {
                    const prevVnode = n2Child[i - 1]
                    let anchor = null
                    if(prevVnode) {
                        // 如果有前一个，则挂在前一个后面
                        anchor = prevVnode.el.nextSibling
                    } else {
                        // 证明是第一个
                        anchor = el.firstChild
                    }
                    patch(null, newVnode, el, anchor)
                }
            }

            // 当更新结束时，我们还需要判断是否有遗留的旧节点需要删除
            for(let i = 0; i<n1Child.length; i++) {
                const oldNode = n1Child[i]
                const has = n2Child.find(node => node.key === oldNode.key)
                if(!has) {
                    unmount(oldNode)
                }
            }
        } else {
            // 如果没有子节点，或子节点是文本节点的情况
            // 只需要清空文本，并且一个个patch 挂载新的子节点就行了
            setElementText(el, '')
            n2Child.forEach(child => patch(null, child, el))
        }
    } else {
        // 新子节点不存在
        if(typeof n1Child === 'string') {
            setElementText(el, '')
        } else if(Array.isArray(n1Child)) {
            n1Child.forEach(child => unmount(child))
        }
    }
}
