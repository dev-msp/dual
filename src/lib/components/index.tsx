import { isFunction } from "rxjs/internal/util/isFunction";
import { type Component, type ComponentProps, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";

export const propsOverride = <E extends C, C extends object>(
  comp: Component<C> | keyof JSX.IntrinsicElements,
  propsOverride:
    | Partial<E>
    | ((props: ComponentProps<typeof comp>) => Partial<E>),
): Component<E> => {
  return (props: ComponentProps<typeof comp>) => {
    const newProps = () =>
      isFunction(propsOverride) ? propsOverride(props) : propsOverride;
    return <Dynamic component={comp} {...props} {...newProps()} />;
  };
};
