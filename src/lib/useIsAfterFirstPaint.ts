import { useEffect, useState } from 'react';

/**
 * Возвращает false при первом рендере и true, когда экран уже нарисован.
 * Нужен, чтобы тяжёлую часть экрана строить после перехода: иначе нажатие «зависает»,
 * пока JavaScript считает данные, а экран открывается рывком.
 */
export function useIsAfterFirstPaint(): boolean {
  const [isAfterFirstPaint, setIsAfterFirstPaint] = useState(false);
  useEffect(() => {
    let secondFrameId = 0;
    // Два кадра подряд: после первого экран нарисован, после второго анимация перехода уже пошла.
    const firstFrameId = requestAnimationFrame(() => {
      secondFrameId = requestAnimationFrame(() => setIsAfterFirstPaint(true));
    });
    return () => {
      cancelAnimationFrame(firstFrameId);
      cancelAnimationFrame(secondFrameId);
    };
  }, []);
  return isAfterFirstPaint;
}
