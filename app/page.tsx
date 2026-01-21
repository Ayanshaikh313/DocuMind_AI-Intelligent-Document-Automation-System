"use client"
import React from 'react'
import HeroSection from '@/section/herosection'
import SecondPage from '@/components/secondPage'
import ThirdPage from '@/components/ThirdPage'
import Footer from '@/components/Footer'

const Home = () => {
  
  return (
  <div>
    <div className='min-h-screen'>
    <HeroSection/>
    </div>
    <div className='min-h-[100vh]'>
    <SecondPage/>
    </div>
    <div className='min-h-screen'>
    <ThirdPage />
    </div>
    <div className='min-h-[50%]'>
    <Footer/>
    </div>
  </div>
  )
}

export default Home