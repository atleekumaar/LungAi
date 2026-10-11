"use client";

import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { RotateCcw, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { Candidate } from "@/types/imaging";

interface Lung3DProps {
  candidates: Candidate[];
  selectedCandidate: Candidate | null;
  onSelectCandidate?: (candidate: Candidate) => void;
}

export function Lung3DReconstruction({
  candidates,
  selectedCandidate,
  onSelectCandidate,
}: Lung3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    const width = currentMount.clientWidth;
    const height = currentMount.clientHeight;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#020712");

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 5, 28);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    currentMount.appendChild(renderer.domElement);

    // Subtle dark grid floor matching reference screenshot
    const gridHelper = new THREE.GridHelper(30, 30, 0x1b3a5c, 0x0c1e33);
    gridHelper.position.y = -7.5;
    scene.add(gridHelper);

    // Ambient and Directional Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x39c7ff, 1.2);
    dirLight.position.set(10, 20, 15);
    scene.add(dirLight);

    // Group containing anatomical lungs
    const lungGroup = new THREE.Group();
    scene.add(lungGroup);

    // Transparent holographic wireframe material
    const lungMaterial = new THREE.MeshPhongMaterial({
      color: 0x39c7ff,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });

    // Left Lung (Elongated volumetric lobe)
    const leftLungGeo = new THREE.SphereGeometry(4.8, 24, 24);
    leftLungGeo.scale(0.85, 1.6, 0.95);
    const leftLungMesh = new THREE.Mesh(leftLungGeo, lungMaterial);
    leftLungMesh.position.set(-4.2, 0, 0);
    lungGroup.add(leftLungMesh);

    // Right Lung
    const rightLungGeo = new THREE.SphereGeometry(5.2, 24, 24);
    rightLungGeo.scale(0.9, 1.55, 1.0);
    const rightLungMesh = new THREE.Mesh(rightLungGeo, lungMaterial);
    rightLungMesh.position.set(4.2, 0, 0);
    lungGroup.add(rightLungMesh);

    // Trachea / Bronchial tree core
    const tracheaGeo = new THREE.CylinderGeometry(0.5, 0.5, 6, 16);
    const tracheaMat = new THREE.MeshBasicMaterial({ color: 0x3185ff, wireframe: true, opacity: 0.5, transparent: true });
    const trachea = new THREE.Mesh(tracheaGeo, tracheaMat);
    trachea.position.set(0, 4.5, 0);
    lungGroup.add(trachea);

    // Candidate Nodule Glowing Spheres
    // Left lung primary nodule (highlighted in orange glow matching screenshot)
    const noduleGeo = new THREE.SphereGeometry(0.75, 16, 16);
    const noduleMat = new THREE.MeshBasicMaterial({ color: 0xff9b57 });
    const primaryNodule = new THREE.Mesh(noduleGeo, noduleMat);
    primaryNodule.position.set(3.8, 3.2, 1.2);
    lungGroup.add(primaryNodule);

    // Outer pulsating halo around candidate
    const haloGeo = new THREE.SphereGeometry(1.4, 16, 16);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xff9b57, wireframe: true, transparent: true, opacity: 0.4 });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.copy(primaryNodule.position);
    lungGroup.add(halo);

    // Additional small secondary candidate nodes
    const secMat = new THREE.MeshBasicMaterial({ color: 0xffb380, wireframe: true });
    [
      [-3.5, -2, 1.0],
      [-4.0, 1.5, -0.5],
      [4.2, -3.2, 0.8],
    ].forEach(([x, y, z]) => {
      const secNode = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), secMat);
      secNode.position.set(x, y, z);
      lungGroup.add(secNode);
    });

    // Slow rotation animation
    let reqId: number;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      lungGroup.rotation.y += 0.003;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!currentMount) return;
      const w = currentMount.clientWidth;
      const h = currentMount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener("resize", handleResize);
      if (currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [candidates, selectedCandidate]);

  return (
    <div className="w-full h-full bg-[#06111f] border border-[#15273c] rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden select-none shadow-xl">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-white text-xs tracking-wide">3D Lung Reconstruction</h3>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#091b33] text-[#39c7ff] border border-[#1b3a5c]">
            Illustrative 3D Preview
          </span>
        </div>
        <Maximize2 className="w-3.5 h-3.5 text-[#8fa6bf] hover:text-white cursor-pointer" />
      </div>

      {/* Main 3D WebGL Canvas */}
      <div ref={mountRef} className="flex-1 w-full h-full min-h-[190px] relative" />

      {/* Floating Left Camera Tool Controls matching screenshot */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10 bg-[#06111f]/80 p-1.5 rounded-lg border border-[#15273c]">
        <RotateCcw className="w-3.5 h-3.5 text-[#8fa6bf] hover:text-[#39c7ff] cursor-pointer" />
        <ZoomIn className="w-3.5 h-3.5 text-[#8fa6bf] hover:text-[#39c7ff] cursor-pointer" />
        <ZoomOut className="w-3.5 h-3.5 text-[#8fa6bf] hover:text-[#39c7ff] cursor-pointer" />
      </div>

      {/* Floating Right Legend matching reference */}
      <div className="absolute right-4 top-12 z-10 bg-[#06111f]/90 border border-[#15273c] p-2.5 rounded-xl text-[10px] font-mono space-y-1.5 text-[#8fa6bf]">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#ff9b57]" />
          <span className="text-white">Selected Candidate</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#ffb380]" />
          <span>Candidate Proposals</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#39c7ff]" />
          <span className="text-[#607996]">Thoracic Mesh (Preview)</span>
        </div>

        <button className="w-full mt-2 py-1 px-2 rounded-lg bg-[#0b1d33] hover:bg-[#122b4a] text-[#39c7ff] border border-[#1a385c] text-[9px] font-semibold transition-all cursor-pointer">
          Reset View
        </button>
      </div>
    </div>
  );
}
