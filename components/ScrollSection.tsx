"use client";

import { motion } from "framer-motion";

export default function ScrollSection() {
  return (
    <section className="min-h-screen bg-[#05070D] flex items-center justify-center text-white px-6">

      <motion.div
        initial={{ opacity: 0, y: 80 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
        className="max-w-4xl text-center"
      >
        <h2 className="text-4xl md:text-6xl font-semibold leading-tight">
          The Internet Gave Us Knowledge.
          <br />
          <span className="text-blue-400">
            It Never Gave Us Execution.
          </span>
        </h2>

        <p className="mt-8 text-gray-400 text-lg">
          Millions start goals every day.
          Few finish them.
          Execution AI is built to change that.
        </p>
      </motion.div>

    </section>
  );
}