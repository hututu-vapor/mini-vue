import { effect, track, trigger } from './effect';

export default function computed(getters) {
    let dirty = true;
    let value;
    const effectFn = effect(getters, {
        lazy: true,
        scheduler() {
            if (!dirty) {
                dirty = true; // 响应式变量发生修改的时候 ，手动触发依赖
                trigger(obj, 'value');
            }
        }
    });

    const obj = {
        get value() {
            if (dirty) {
                value = effectFn();
                dirty = false;
            }
            track(obj, 'value'); // 收集依赖
            return value;
        }
    };

    return obj;
}
