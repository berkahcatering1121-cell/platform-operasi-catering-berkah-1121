// @ts-nocheck
'use client'

import { Canvas, extend, useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { useMemo, useRef, useState, useEffect } from 'react'
import * as THREE from 'three/webgpu'
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js'

import {
  abs,
  blendScreen,
  float,
  mod,
  mx_cell_noise_float,
  oneMinus,
  smoothstep,
  texture,
  uniform,
  uv,
  vec2,
  vec3,
  pass,
  mix,
  add,
} from 'three/tsl'

// Catering food photo for the desktop hero (loads on the user's browser; the
// hero is desktop + WebGPU + online only, and falls back to the branded graphic
// via the ErrorBoundary if this fails to load). Unsplash serves CORS headers,
// which WebGPU texture uploads require.
const TEXTUREMAP = {
  src: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1920&q=80',
}

// Brand gold used for the scan line / bloom accents (#C9A93B).
const GOLD = vec3(0.79, 0.66, 0.23)

extend(THREE as any)

// Procedural vertical depth gradient (top → bottom). Replaces the external
// depth map so the scan/flow effect works with any brand photo.
function useDepthTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 8
    c.height = 256
    const ctx = c.getContext('2d')!
    const g = ctx.createLinearGradient(0, 0, 0, 256)
    g.addColorStop(0, '#000000')
    g.addColorStop(1, '#ffffff')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 8, 256)
    const tex = new THREE.CanvasTexture(c)
    tex.needsUpdate = true
    return tex
  }, [])
}

const PostProcessing = ({
  strength = 1,
  threshold = 1,
  fullScreenEffect = true,
}: {
  strength?: number
  threshold?: number
  fullScreenEffect?: boolean
}) => {
  const { gl, scene, camera } = useThree()
  const progressRef = useRef({ value: 0 })

  const render = useMemo(() => {
    const postProcessing = new THREE.PostProcessing(gl as any)
    const scenePass = pass(scene, camera)
    const scenePassColor = scenePass.getTextureNode('output')
    const bloomPass = bloom(scenePassColor, strength, 0.5, threshold)

    const uScanProgress = uniform(0)
    progressRef.current = uScanProgress

    const scanPos = float(uScanProgress.value)
    const uvY = uv().y
    const scanWidth = float(0.05)
    const scanLine = smoothstep(0, scanWidth, abs(uvY.sub(scanPos)))
    const goldOverlay = GOLD.mul(oneMinus(scanLine)).mul(0.35)

    const withScanEffect = mix(
      scenePassColor,
      add(scenePassColor, goldOverlay),
      fullScreenEffect ? smoothstep(0.9, 1.0, oneMinus(scanLine)) : 1.0,
    )

    const final = withScanEffect.add(bloomPass)
    postProcessing.outputNode = final
    return postProcessing
  }, [camera, gl, scene, strength, threshold, fullScreenEffect])

  useFrame(({ clock }) => {
    progressRef.current.value = Math.sin(clock.getElapsedTime() * 0.5) * 0.5 + 0.5
    render.renderAsync()
  }, 1)

  return null
}

const Scene = () => {
  const rawMap = useTexture(TEXTUREMAP.src)
  const depthMap = useDepthTexture()

  const meshRef = useRef<any>(null)
  const [visible, setVisible] = useState(false)
  const { viewport } = useThree()

  useEffect(() => {
    if (rawMap && depthMap) setVisible(true)
  }, [rawMap, depthMap])

  const { material, uniforms } = useMemo(() => {
    const uPointer = uniform(new THREE.Vector2(0))
    const uProgress = uniform(0)

    const strength = 0.012
    const tDepthMap = texture(depthMap)
    const tMap = texture(rawMap, uv().add(tDepthMap.r.mul(uPointer).mul(strength)))

    const aspect = float(1.0)
    const tUv = vec2(uv().x.mul(aspect), uv().y)

    const tiling = vec2(120.0)
    const tiledUv = mod(tUv.mul(tiling), 2.0).sub(1.0)
    const brightness = mx_cell_noise_float(tUv.mul(tiling).div(2))

    const dist = float(tiledUv.length())
    const dot = float(smoothstep(0.5, 0.49, dist)).mul(brightness)

    const depth = tDepthMap
    const flow = oneMinus(smoothstep(0, 0.02, abs(depth.sub(uProgress))))

    // Gold shimmering dot-grid revealed by the scan line.
    const mask = dot.mul(flow).mul(GOLD.mul(9))
    const final = blendScreen(tMap, mask)

    const material = new THREE.MeshBasicNodeMaterial({
      colorNode: final,
      transparent: true,
      opacity: 0,
    })

    return { material, uniforms: { uPointer, uProgress } }
  }, [rawMap, depthMap])

  // Cover the whole viewport with the photo.
  const scale = useMemo(() => {
    const imgAspect = (rawMap?.image?.width ?? 3) / (rawMap?.image?.height ?? 2)
    const vpAspect = viewport.width / viewport.height
    return vpAspect > imgAspect
      ? [viewport.width, viewport.width / imgAspect, 1]
      : [viewport.height * imgAspect, viewport.height, 1]
  }, [rawMap, viewport.width, viewport.height])

  useFrame(({ clock }) => {
    uniforms.uProgress.value = Math.sin(clock.getElapsedTime() * 0.5) * 0.5 + 0.5
    const mat = meshRef.current?.material
    if (mat && 'opacity' in mat) {
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, visible ? 1 : 0, 0.06)
    }
  })

  useFrame(({ pointer }) => {
    uniforms.uPointer.value = pointer
  })

  return (
    <mesh ref={meshRef} scale={scale as any} material={material}>
      <planeGeometry />
    </mesh>
  )
}

/**
 * Full-screen WebGPU hero background (branded catering photo + gold scan/bloom).
 * Renders only the canvas; overlay UI (e.g. the login form) is layered on top by
 * the caller. Requires WebGPU — the caller should gate on `navigator.gpu`.
 */
export default function HeroFuturistic() {
  return (
    <div className="absolute inset-0">
      <Canvas
        flat
        gl={async (props) => {
          const renderer = new THREE.WebGPURenderer(props as any)
          await renderer.init()
          return renderer
        }}
      >
        <PostProcessing fullScreenEffect />
        <Scene />
      </Canvas>
    </div>
  )
}
