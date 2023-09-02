import { patch } from "./index.js"
import { unmount } from "./unmount.js"
import { insert, setElementText } from "./utils.js"

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
            // 方式二 利用key来复用dom，并且调整好dom的顺序
            // 方式三 双端diff

            doubleDiff(n1, n2)
            
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

// 双端diff
function doubleDiff (n1, n2, container) {
    let oldStartIndex = 0
    let oldEndIndex = n1.length - 1
    let newStartIndex = 0
    let newEndIndex = n2.length - 1
    while(oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {
        let oldStartNode = n1[oldStartIndex]
        let oldEndNode = n1[oldEndIndex]
        let newStartNode = n2[newStartIndex]
        let newEndNode = n2[newEndIndex]
        if(!oldStartNode) {
            // 在刚才被设为undefined的那个，证明已经处理过了,跳过即可
            ++oldStartIndex
        }else if(!oldEndNode) {
            --oldEndIndex
        }else if(oldStartIndex.key === newStartNode.key) {
            // 新头旧头
            patch(oldStartNode, newStartNode, container)
            ++oldStartIndex
            ++newStartIndex
        } else if(oldEndNode.key === newEndNode.key) {
            // 旧尾新尾
            patch(oldEndNode, newEndNode, container)
            --oldEndIndex
            --newEndIndex
        } else if(oldStartNode.key === newEndNode.key) {
            // 旧头新尾
            patch(oldStartNode, newEndNode, container)
            insert(oldStartNode.el, container, oldEndNode.el.nextSibling)
            ++oldStartIndex
            --newEndIndex
        } else if(newStartNode.key === oldEndNode.key){
            // 新头旧尾
            patch(oldEndNode, newStartNode, container)
            insert(oldEndNode.el, container, oldStartNode.el)
            --oldEndIndex
            ++newStartIndex
        } else {
            // 假设都找不到，那我就需要用新头对比旧的一组子节点去找
            let find = false
            for(let i = 0; i < n1.length; i++) {
                if(newStartNode.key === n1[i].key) {
                    find = true
                    patch(n1[i], newStartNode, container)
                    insert(n1[i].el, container, oldStartNode.el)
                    n1[i] = undefined
                    break;
                }
            }
            if(!find) {
                // 没有找到， 证明这个是新增的, 去挂载
                patch(null, newStartNode, container, oldStartNode.el)
            }
            ++newStartIndex
        }
    }

    if(oldEndIndex < oldStartIndex && newStartIndex <= newEndIndex) {
        // 对比完，最后新节点还剩 证明还有东西需要挂载
        for(let i = newStartIndex; i <= newEndIndex; i++) {
            patch(null, n2[i], container, oldStartNode.el)
        }
    } else if(newEndIndex < newStartIndex && oldStartIndex <= oldEndIndex) {
        // 对比完，最后旧节点还剩 证明还有东西需要挂载
        for(let i = oldStartIndex; i <= oldEndIndex; i++) {
            unmount(n1[i])
        }
    }
}